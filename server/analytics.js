// 访客行为分析：事件存储（JSONL 追加写）+ 聚合统计 + IP 地区解析 + IP 脱敏。
// 零三方依赖，仅用 Node 内置模块，保证云端部署包自包含。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 数据目录：可用环境变量 ANALYTICS_DIR 指向持久卷（容器/云部署推荐）。
const DATA_DIR = process.env.ANALYTICS_DIR
  ? path.resolve(process.env.ANALYTICS_DIR)
  : path.join(__dirname, 'data')
const EVENTS_FILE = path.join(DATA_DIR, 'events.jsonl')

// 统计/展示统一按中国时区（Asia/Shanghai，UTC+8，无夏令时）。
// 避免服务器默认 UTC 与中国用户本地时间相差一天，导致「今天」数据对不上。
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000

try {
  fs.mkdirSync(DATA_DIR, { recursive: true })
} catch (e) {
  console.error('[analytics] 无法创建数据目录', DATA_DIR, e)
}

// ===== IP 脱敏 =====
// IPv4：仅隐藏最后一段（主机位），保留前三段（网络段），例如 120.11.22.33 -> 120.11.22.*，
// 既能保护具体主机隐私，又能清晰区分来自不同网络的访客。IPv6/其他做粗粒度脱敏。
export function maskIp(ip = '') {
  if (!ip) return '未知'
  const v4 = String(ip).match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.*`
  if (ip.includes(':')) {
    const p = ip.split(':')
    if (p.length > 3) return `${p[0]}:*:*:…:${p[p.length - 1]}`
    return `${p[0]}:*:…`
  }
  return ip
}

// ===== 日期工具（统一按 Asia/Shanghai 的「天」边界）=====
function dayBounds(ts) {
  // 把中国时间当成“偏移后的 UTC”来取整，得到当天 00:00 的 UTC 毫秒戳。
  const chinaMs = ts + TZ_OFFSET_MS
  const startChina = Math.floor(chinaMs / 86400000) * 86400000
  const start = startChina - TZ_OFFSET_MS
  return { start, end: start + 86400000 }
}
function parseDateStr(s) {
  // 'YYYY-MM-DD'（中国日期）-> 当天 00:00 起的 UTC [start, end)
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const start = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - TZ_OFFSET_MS
  if (Number.isNaN(start)) return null
  return { start, end: start + 86400000 }
}
function ymd(ts) {
  // 返回中国日期字符串
  const d = new Date(ts + TZ_OFFSET_MS)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
}

export function appendEvent(ev) {
  try {
    fs.appendFileSync(EVENTS_FILE, JSON.stringify(ev) + '\n', 'utf8')
  } catch (e) {
    console.error('[analytics] 写入事件失败', e)
  }
}

// IP → 地区（ip-api.com 免费接口，非商业）。解析失败/内网返回友好文案，绝不阻塞。
export async function resolveRegion(ip) {
  if (!ip) return '未知'
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return '内网/本地'
  }
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    const r = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?lang=zh-CN&fields=status,message,country,regionName,city`,
      { signal: ctrl.signal }
    )
    clearTimeout(timer)
    const d = await r.json()
    if (d && d.status === 'success') {
      return [d.country, d.regionName, d.city].filter(Boolean).join('·') || '未知'
    }
    return '未知'
  } catch {
    return '未知'
  }
}

// 轻量缓存：仅在文件 mtime/size 变化时才重新读取解析，避免 /stats 每 10 秒轮询都全量重读。
let _cache = { mtimeMs: 0, size: -1, events: [] }
function readEvents() {
  let stat = null
  try {
    stat = fs.statSync(EVENTS_FILE)
  } catch {
    return []
  }
  if (stat.mtimeMs === _cache.mtimeMs && stat.size === _cache.size && _cache.events.length) {
    return _cache.events
  }
  let raw = ''
  try {
    raw = fs.readFileSync(EVENTS_FILE, 'utf8')
  } catch {
    return []
  }
  const out = []
  for (const ln of raw.split('\n')) {
    if (!ln.trim()) continue
    try {
      out.push(JSON.parse(ln))
    } catch {
      /* 跳过损坏行 */
    }
  }
  _cache = { mtimeMs: stat.mtimeMs, size: stat.size, events: out }
  return out
}

// ===== 聚合 =====
// range: { fromTs, toTs } 或 null（全量）。
// 返回：全局卡片指标（累计/今日独立访客、提问数）+ 当前范围筛选后的访客视图。
export function aggregate(range) {
  const events = readEvents()
  const now = Date.now()
  const today = dayBounds(now)

  // —— 全局指标（不受范围筛选影响）——
  const allVisitorIds = new Set()
  const todayVisitorIds = new Set()
  // 全局去重 IP -> 短编号（按首次出现顺序分配，稳定不变），用于区分同一网段下不同主机。
  const ipOrder = new Map()
  let todayVisits = 0
  let todayChats = 0
  let totalChats = 0
  for (const e of events) {
    const vid = e.visitorId || e.ip || 'unknown'
    allVisitorIds.add(vid)
    if (e.ip && !ipOrder.has(e.ip)) ipOrder.set(e.ip, ipOrder.size + 1)
    if (e.ts >= today.start && e.ts < today.end) {
      todayVisitorIds.add(vid)
      if (e.type === 'visit') todayVisits += 1
      if (e.type === 'chat') todayChats += 1
    }
    if (e.type === 'chat') totalChats += 1
  }

  // —— 范围筛选后的访客视图 ——
  const fromTs = range?.fromTs ?? -Infinity
  const toTs = range?.toTs ?? Infinity
  const byVisitor = new Map()
  for (const e of events) {
    if (e.ts < fromTs || e.ts >= toTs) continue
    const vid = e.visitorId || e.ip || 'unknown'
    if (!byVisitor.has(vid)) {
      byVisitor.set(vid, {
        visitorId: vid,
        ip: e.ip || '',
        region: '',
        firstSeen: e.ts,
        lastSeen: e.ts,
        visits: 0,
        durationSec: 0,
        chats: [],
        pages: {},
        ua: e.ua || '',
      })
    }
    const v = byVisitor.get(vid)
    if (e.region) v.region = e.region
    if (e.ip) v.ip = e.ip
    if (e.ua) v.ua = e.ua
    if (e.ts < v.firstSeen) v.firstSeen = e.ts
    if (e.ts > v.lastSeen) v.lastSeen = e.ts
    if (e.type === 'visit') v.visits += 1
    if ((e.type === 'leave' || e.type === 'pageleave') && typeof e.duration === 'number') {
      v.durationSec += e.duration
    }
    // 页面浏览：visit / pageview 计入该页被查看次数；pageleave 累加该页驻留时长
    if ((e.type === 'visit' || e.type === 'pageview') && e.path) {
      const pg = v.pages[e.path] || (v.pages[e.path] = { views: 0, durSec: 0 })
      pg.views += 1
    }
    if (e.type === 'pageleave' && e.path && typeof e.duration === 'number') {
      const pg = v.pages[e.path] || (v.pages[e.path] = { views: 0, durSec: 0 })
      pg.durSec += e.duration
    }
    if (e.type === 'chat' && e.question) {
      v.chats.push({ ts: e.ts, question: e.question, answer: e.answer || '' })
    }
  }

  const visitors = [...byVisitor.values()]
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .map((v) => {
      const pages = Object.keys(v.pages)
        .map((k) => ({ path: k, views: v.pages[k].views, durSec: v.pages[k].durSec }))
        .sort((a, b) => b.durSec - a.durSec || b.views - a.views)
      // 脱敏 IP + 去重短编号（同一 /24 网段下不同主机也靠编号区分）
      const idx = v.ip ? ipOrder.get(v.ip) : 0
      const ipMasked = maskIp(v.ip) + (idx ? ' #' + String(idx).padStart(2, '0') : '')
      return { ...v, ipMasked, pages }
    })

  return {
    generatedAt: now,
    range: range ? { from: ymd(fromTs), to: ymd(toTs - 1) } : null,
    totals: {
      totalVisitors: allVisitorIds.size, // 累计访问人数：所有独立访客总数
      todayVisitors: todayVisitorIds.size, // 今日到访人数：今天已访问的独立访客数
      todayVisits,
      todayChats,
      totalChats,
    },
    visitors,
  }
}

// ===== 每日序列（柱状图）=====
// 返回 days 天、以 endDate 当天结尾的每日独立访客数（visitors）与访问次数（visits）。
export function dailySeries(days = 14, endDate = null) {
  const events = readEvents()
  const n = Math.max(1, Math.min(60, Number(days) || 14))
  const end = endDate ? parseDateStr(endDate) : dayBounds(Date.now())
  const anchor = (end ? end.start : dayBounds(Date.now()).start)
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const dayStart = anchor - i * 86400000
    const dayEnd = dayStart + 86400000
    const ids = new Set()
    let visits = 0
    for (const e of events) {
      if (e.ts >= dayStart && e.ts < dayEnd && e.type === 'visit') {
        visits += 1
        ids.add(e.visitorId || e.ip || 'unknown')
      }
    }
    out.push({ date: ymd(dayStart), visitors: ids.size, visits })
  }
  return out
}

// ===== 访客长期记忆 =====
// 返回某访客的历史问答（按时间从早到晚），供 AI 答疑小蜜读取，避免重复回答同一问题。
export function getVisitorMemory(visitorId, limit = 12) {
  if (!visitorId) return []
  const events = readEvents()
  const chats = []
  for (const e of events) {
    if (e.type !== 'chat' || !e.question) continue
    const vid = e.visitorId || e.ip || 'unknown'
    if (vid !== visitorId) continue
    chats.push({ ts: e.ts, question: e.question, answer: e.answer || '' })
  }
  chats.sort((a, b) => a.ts - b.ts)
  return chats.slice(-Math.max(1, Math.min(50, Number(limit) || 12)))
}

export { DATA_DIR, EVENTS_FILE, parseDateStr }
