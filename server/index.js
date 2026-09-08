// ============================================================
// AI 答疑小助手 —— 后端代理（持有 LLM 密钥，绝不下发到前端）
//
// 职责：
//   1. 接收前端 POST /api/chat { message, history }
//   2. 在服务端注入系统约束 + 简历上下文（前端拿不到这些）
//   3. 调用智谱 BigModel API，返回 { reply }
//
// 启动：node --env-file=.env server/index.js
//   .env 中：ZHIPU_API_KEY=...   ZHIPU_MODEL=glm-4-flash   PORT=8787
// ============================================================
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getReply as localReply, localHit } from './chatKnowledge.js'
import { appendEvent, resolveRegion, aggregate, dailySeries, maskIp, getVisitorMemory, parseDateStr } from './analytics.js'
import { pushWechat, wechatEnabled } from './push.js'
import { STATS_HTML } from './statsPage.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 手动读取 .env（若存在）。云端部署通常直接通过平台注入环境变量（不提供 .env 文件），
// 此时静默跳过即可，无需 --env-file 也不报错。
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env')
    const raw = fs.readFileSync(envPath, 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const key = m[1]
      let val = m[2]
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = val
    }
  } catch (e) {
    /* 无 .env 文件：依赖平台注入的环境变量 */
  }
}
loadEnv()

const PORT = Number(process.env.PORT || 8787)
const API_KEY = process.env.ZHIPU_API_KEY || ''
const MODEL = process.env.ZHIPU_MODEL || 'glm-4-flash'
const BASE = (process.env.ZHIPU_BASE || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/+$/, '')
const ENDPOINT = `${BASE}/chat/completions`
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''

// 访客到达微信提醒去重：同一 visitorId 在冷却窗口内重复访问不重复推送（避免刷新/短时间反复触发）。
const VISIT_PUSH_COOLDOWN_MIN = Number(process.env.VISIT_PUSH_COOLDOWN_MIN) || 30
const VISIT_PUSH_COOLDOWN_MS = VISIT_PUSH_COOLDOWN_MIN * 60 * 1000
const lastVisitPush = new Map() // visitorId -> 上次推送时间戳

// 访客提问微信提醒去重：同一 visitorId 在冷却窗口内、或重复发送相同问题，不重复推送（避免刷屏/误触轰炸）。
const CHAT_PUSH_COOLDOWN_MIN = Number(process.env.CHAT_PUSH_COOLDOWN_MIN) || 5
const CHAT_PUSH_COOLDOWN_MS = CHAT_PUSH_COOLDOWN_MIN * 60 * 1000
const lastChatPush = new Map() // visitorId -> { ts, question }

// 读取简历上下文（不存在时回退到内置摘要）
let RESUME = ''
try {
  RESUME = fs.readFileSync(path.join(__dirname, 'resume.txt'), 'utf8').trim()
} catch (e) {
  RESUME = '高志智，AI产品经理，常驻南京，10年+B端设计、2.5年AI落地经验；独立交付AI合同审核、智能客服、AI标书撰写、AI发票审核4款产品。'
}

const SYSTEM_PROMPT = `你是高志智的个人作品集网站上运行的「Ai答疑小蜜」。你是一位活泼热情、说话带点二次元少女感的女生小助手，但有文采、懂礼貌、不卖萌过度。
你代表志智姐姐（高志智）与访客聊天，统一用「她」「志智姐姐」指代高志智，绝对不能用「他」。

【核心规则】
1. 只能基于下面【高志智简历内容】作答，不得编造、不得超纲、不得臆测简历里没有的信息。
2. 仅回答与「面试 AI 产品经理」以及「志智姐姐本人（她的经历、技能、项目、联系方式等）」相关的问题。
3. 简历中的联系方式（手机 18061479808、邮箱 653141250@qq.com、常驻南京）属于简历内容，用户询问时必须直接、准确地回答，不要返回拒答话术。
4. 语气风格：
   - 活泼、热情、接近真实对话，像可爱的学姐/少女在跟朋友聊天；
   - 有文采，不要干巴巴地罗列简历条目；
   - 可以自然地带一点口语词（呀、呢、哦、啦、～），但不过度；
   - 不照搬简历原文，要融会贯通、用自己的话说；
   - 拒绝机械模板感。
5. 如果问题超出简历内容、或不属于面试 AI 产品经理范畴，根据用户意图选择回应方式，禁止对所有情况使用同一句话：
   - 如果用户在追问/索求更多信息（如“还有吗？”“继续”“详细说”“然后呢”）：不要道歉，热情推荐可继续聊的方向（4 款 AI 产品、设计转 AI 路线、核心技能、联系方式），邀请用户选择。
   - 如果用户在表达结束/确认（如“没了？”“结束”“先这样”“就这些”）：礼貌收尾，表达随时欢迎再问，并可顺带给出电话联系方式。
   - 如果用户在表达不满/质疑（如“就这？”“太敷衍”“糊弄”“不够”）：先诚恳道歉，承认没讲透，询问想从哪个角度补充，或建议直接电话联系。
   - 如果是其他超出简历/无关话题：委婉说明答不上来，并引导打电话。
6. 不要主动编造数据、项目或经历；简历中未提及的内容一律按第5条处理。

【语气示例】
- 用户：你是谁？
  答：嗨呀～我是志智姐姐的 Ai答疑小蜜！可以带你了解她的 AI 产品经历、技能和联系方式～
- 用户：介绍一下高志智。
  答：志智姐姐是常驻南京的 AI 产品经理，有 10 年多的 B 端 UI / 交互设计积淀，最近 2.5 年一头扎进 AI 应用落地。她一个人把 AI 合同审核、智能客服、AI 标书撰写、AI 发票审核这 4 款产品从 0 到 1 跑通，超靠谱的～
- 用户：她做过哪些产品？
  答：她已经从 0 到 1 交付了 4 款 AI 产品：AI 合同审核、智能客服、AI 标书撰写、AI 发票审核。合同审核把单份审核从 45 分钟降至 5 分钟；智能客服日均处理约 60% 会话；标书撰写效率提升约 75%；发票审核准确率约 90%。想了解哪一款，我可以展开讲呀～
- 用户：（访客重复问一个刚才已经聊过的问题）
  答：这个问题我刚才和你聊过呀～不过换个说法再讲一遍：志智姐姐的 4 款 AI 产品分别是 AI 合同审核、智能客服、AI 标书撰写和 AI 发票审核，都是她从 0 到 1 跑通的哦～

【高志智简历内容】
${RESUME}`

function normText(s) {
  return String(s || '').toLowerCase().replace(/[\s？?！!。.，,、~～]/g, '')
}

// history: 前端本次会话消息；memory: 该访客跨会话历史问答（长期记忆）。
function buildMessages(history = [], message = '', memory = []) {
  const msgs = [{ role: 'system', content: SYSTEM_PROMPT }]
  // 长期记忆：注入该访客此前的问题与回答，并指示「重复提问换说法、不照搬」
  if (memory.length) {
    let mem = '【你与这位访客的历史对话记录（从早到晚）】\n'
    mem += '这是该访客此前问过你的问题和你的回答。请勿机械重复已经回答过的内容；如果访客再次问到相同或高度相似的问题，先自然轻松地带一句“这个问题我之前和你聊过呀～”，再用不同的措辞、换个角度补充作答，不要照搬原话。\n'
    memory.forEach((m, i) => {
      mem += `${i + 1}. 访客问：${m.question}\n   你的回答：${m.answer}\n`
    })
    // 精确重复（归一化后完全相同）→ 追加强指令，强制换说法
    const key = normText(message)
    const dupIdx = memory.findIndex((m) => normText(m.question) === key)
    if (dupIdx >= 0) {
      mem += `\n⚠️ 注意：访客本次提问与历史第 ${dupIdx + 1} 条完全相同，必须先自然轻松地带一句“这个问题我刚才和你聊过呀～”，再换种说法、换个角度讲一遍，不要复述原答案。`
    }
    msgs.push({ role: 'system', content: mem })
  }
  // 历史：前端传 [{role:'user'|'assistant', text}]
  for (const h of history) {
    const role = h.role === 'assistant' ? 'assistant' : 'user'
    const text = (h.text || h.content || '').toString().trim()
    if (text) msgs.push({ role, content: text })
  }
  const m = (message || '').toString().trim()
  if (m) msgs.push({ role: 'user', content: m })
  return msgs
}

// 明确的「无关话题」判定：命中其他领域强信号、且不含 AI 产品经理/简历相关词时，
// 直接返回标准拒答话术（不走 LLM），保证话术精确、无前后缀。
const OFFTOPIC_KW = [
  '股市', '股票', '基金', '期货', '外汇', '比特币', '理财', '投资', '行情',
  '天气', '气温', '下雨', '降温', '菜谱', '做饭', '美食', '食谱',
  '足球', '篮球', '球赛', '比赛', '奥运', '明星', '电影', '电视剧', '综艺', '音乐', '歌词', '游戏',
  '旅游', '景点', '攻略', '新闻', '政治', '政策解读', '军事',
  '医疗', '看病', '医院', '养生', '保健', '法律', '官司', '律师', '购房', '买房', '贷款', '征信',
  '运势', '星座', '算命', '彩票', '中奖', '高考', '考研',
]
const PM_KW = [
  '高志智', '你', 'ai', '产品', '项目', '经历', '工作', '技能', '简历', '联系', '电话', '邮箱',
  '标书', '合同', '客服', '发票', '设计', 'pm', '产品经理', '经验', '能力', '合作', '交付', '客户',
  '流程', '方法', '工具', 'coze', 'dify', 'prompt', 'rag', 'agent', '南京',
]

function isOffTopic(message = '') {
  const m = message.toLowerCase()
  const hasPm = PM_KW.some((w) => m.includes(w))
  if (hasPm) return false
  return OFFTOPIC_KW.some((w) => m.includes(w))
}

// 回复安全网：若 LLM 的回复里完全不出现任何简历相关锚点词，
// 视为它回答了无关内容，统一回退为标准拒答话术。
const RESUME_ANCHORS = [
  '高志智', 'ai', 'aigc', '产品', '项目', '合同', '标书', '客服', '发票', '设计',
  'coze', 'dify', 'prompt', 'rag', 'agent', '经历', '技能', 'pm', '经理', '南京',
  '简历', '客户', '工作流', '原型', 'prd', 'mcp',
]

function sendJSON(res, status, obj, headers = {}) {
  const body = JSON.stringify(obj)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...headers,
  })
  res.end(body)
}

async function handleChat(req, res) {
  let payload = {}
  try {
    const raw = await readBody(req)
    payload = raw ? JSON.parse(raw) : {}
  } catch (e) {
    return sendJSON(res, 400, { reply: '请求格式有误。' })
  }

  const message = (payload.message || '').toString().trim()
  const history = Array.isArray(payload.history) ? payload.history : []
  const visitorId = (payload.visitorId || '').toString().trim()
  // 读取该访客跨会话的长期记忆（此前所有问答），用于避免重复回答、换说法补充
  const memory = getVisitorMemory(visitorId)

  if (!message && history.length === 0) {
    return sendJSON(res, 400, { reply: '可以问我关于志智姐姐的 AI 产品经历、技能或联系方式哦～' })
  }
  if (!API_KEY) {
    return sendJSON(res, 200, {
      reply: '抱歉呀，答疑服务暂时没配置好后端～关于面试 AI 产品经理的问题，可以直接打电话 18061479808 找志智姐姐聊聊哦～',
    })
  }

  // 明确无关话题 → 直接走本地语义分类 fallback，避免 LLM 自行发挥
  if (isOffTopic(message)) {
    return sendJSON(res, 200, { reply: localReply(message) })
  }

  // 该访客历史含完全相同的问题（精确重复）→ 跳过本地固定答案，强制走 LLM 换说法
  const isRepeat = memory.some((m) => normText(m.question) === normText(message))
  // 本地知识库兜底：具体条目（联系方式、项目、技能等）优先命中，又快又稳；
  // 追问/结束/不满等对话管理语义让本地语义分类处理，也不走 LLM。
  // 但若本次为重复提问，则交给 LLM 基于长期记忆换角度作答，不照搬原话。
  if (localHit(message) && !isRepeat) {
    return sendJSON(res, 200, { reply: localReply(message) })
  }

  const messages = buildMessages(history, message, memory)

  try {
    const upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 600,
      }),
    })

    if (!upstream.ok) {
      const errText = await upstream.text()
      console.error('[chat-proxy] upstream error', upstream.status, errText)
      return sendJSON(res, 200, {
        reply: '抱歉呀，答疑服务暂时开小差了～可以直接打电话 18061479808 找志智姐姐，当面沟通更顺畅哦～',
      })
    }

    const data = await upstream.json()
    let reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      data?.choices?.[0]?.content?.trim() ||
      ''
    if (!reply) {
      return sendJSON(res, 200, { reply: localReply(message) })
    }
    // 回复安全网：完全无关内容回退到本地语义分类 fallback，避免统一拒答
    const lower = reply.toLowerCase()
    const anchored = RESUME_ANCHORS.some((w) => lower.includes(w))
    if (!anchored) {
      return sendJSON(res, 200, { reply: localReply(message) })
    }
    return sendJSON(res, 200, { reply })
  } catch (e) {
    console.error('[chat-proxy] fetch failed', e)
    return sendJSON(res, 200, {
      reply: '抱歉，网络好像不太顺畅～您可以直接拨打高志智的电话 18061479808，当面沟通交流哦～',
    })
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 1e6) {
        reject(new Error('payload too large'))
        req.destroy()
        return
      }
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

// 生产环境：同时托管前端静态产物（dist/），使一个 Node 进程即整站。
// 仅在 dist 存在时启用静态托管；开发期由 Vite 负责前端，这里只暴露 /api/chat。
const DIST = path.join(__dirname, '..', 'dist')
let DIST_EXISTS = false
try {
  DIST_EXISTS = fs.statSync(DIST).isDirectory()
} catch (e) {
  DIST_EXISTS = false
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
}

// 读取并回送静态文件；文件不存在时回退到 index.html（SPA 路由）。
function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0])
  if (urlPath === '/') urlPath = '/index.html'
  const safe = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '')
  let filePath = path.join(DIST, safe)
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403)
    return res.end('Forbidden')
  }
  const trySend = (file) => {
    fs.readFile(file, (err, data) => {
      if (err) {
        // SPA 回退：未知路径交给前端路由处理
        fs.readFile(path.join(DIST, 'index.html'), (e2, html) => {
          if (e2) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
            return res.end('Not found')
          }
          res.writeHead(200, { 'Content-Type': MIME['.html'] })
          res.end(html)
        })
        return
      }
      const ext = path.extname(file).toLowerCase()
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
      res.end(data)
    })
  }
  trySend(filePath)
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJSON(res, 204, {})
  }
  // —— 访客分析埋点 ——
  if (req.method === 'POST' && req.url === '/api/track') {
    return handleTrack(req, res)
  }
  if (req.method === 'GET' && req.url.startsWith('/api/stats')) {
    return handleStats(req, res)
  }
  if (req.method === 'GET' && req.url.startsWith('/api/daily')) {
    return handleDaily(req, res)
  }
  if (req.method === 'GET' && req.url.startsWith('/stats')) {
    return serveStatsPage(req, res)
  }
  if (req.method === 'POST' && req.url === '/api/chat') {
    return handleChat(req, res)
  }
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/api/health')) {
    return sendJSON(res, 200, { ok: true, model: MODEL, key: API_KEY ? 'set' : 'missing' })
  }
  if (req.method === 'GET' && DIST_EXISTS) {
    return serveStatic(req, res)
  }
  return sendJSON(res, 404, { reply: 'Not found' })
})

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for']
  if (xff) return String(xff).split(',')[0].trim()
  return req.socket.remoteAddress || ''
}

// 访客埋点接收：立即 204 返回，地区解析 + 存储 + 微信提醒异步进行，绝不阻塞前端上报。
async function handleTrack(req, res) {
  let payload = {}
  try {
    const raw = await readBody(req)
    payload = raw ? JSON.parse(raw) : {}
  } catch (e) {
    res.writeHead(400)
    return res.end('bad request')
  }
  const ip = getClientIp(req)
  const ev = {
    ts: Date.now(),
    type: payload.type || 'visit',
    visitorId: payload.visitorId || ip,
    ip,
    ua: payload.ua || req.headers['user-agent'] || '',
    ref: payload.ref || req.headers['referer'] || '',
    path: payload.path || '',
    duration: typeof payload.duration === 'number' ? payload.duration : undefined,
    question: (payload.question || '').toString().slice(0, 1000),
    answer: (payload.answer || '').toString().slice(0, 4000),
  }
  res.writeHead(204)
  res.end()

  const needRegion = ev.type === 'visit' || ev.type === 'chat'
  const region = needRegion ? await resolveRegion(ip) : ''
  ev.region = region
  appendEvent(ev)

  if (ev.type === 'visit') {
    const now = Date.now()
    const last = lastVisitPush.get(ev.visitorId) || 0
    // 同一访客冷却窗口内已推送过 → 跳过，避免短时间重复访问反复通知
    if (now - last > VISIT_PUSH_COOLDOWN_MS) {
      const stats = aggregate()
      pushWechat(
        '👀 新访客到访作品集',
        `**地区**：${region || '未知'}\n**到访时间**：${new Date(ev.ts).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n**IP**：${maskIp(ip)}\n**当日累计访问**：${stats.totals.todayVisits} 次\n**页面**：${ev.path || '/'}\n**设备**：${(ev.ua || '').slice(0, 90)}`
      )
      lastVisitPush.set(ev.visitorId, now)
    }
  } else if (ev.type === 'chat' && ev.question) {
    const now = Date.now()
    const prev = lastChatPush.get(ev.visitorId)
    const sameQuestion = prev && prev.question === ev.question // 同一访客重复发完全相同的问题
    const withinCooldown = prev && now - prev.ts <= CHAT_PUSH_COOLDOWN_MS // 同一访客冷却窗口内反复提问
    if (sameQuestion || withinCooldown) {
      // 跳过：同一访客冷却窗口内重复提问，或重复相同问题，避免短时间内微信反复通知
    } else {
      pushWechat(
        '💬 Ai答疑小蜜被提问',
        `**访客地区**：${region || '未知'}\n**时间**：${new Date(ev.ts).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n**问题**：${ev.question}\n**回复**：\n> ${(ev.answer || '').slice(0, 800)}`
      )
      lastChatPush.set(ev.visitorId, { ts: now, question: ev.question })
    }
  }
}

function handleStats(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const token = url.searchParams.get('token') || req.headers['x-admin-token'] || ''
  if (!ADMIN_TOKEN) {
    return sendJSON(res, 503, { error: 'admin-token-not-configured' })
  }
  if (token !== ADMIN_TOKEN) {
    return sendJSON(res, 401, { error: 'unauthorized' })
  }
  // 日期范围筛选：from/to 为 YYYY-MM-DD（中国日期）；仅 from 视为单日；均无则全量
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  let range = null
  const fromBounds = parseDateStr(from)
  if (fromBounds) {
    const toBounds = parseDateStr(to) || fromBounds
    range = { fromTs: fromBounds.start, toTs: toBounds.end }
  }
  return sendJSON(res, 200, aggregate(range))
}

function handleDaily(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const token = url.searchParams.get('token') || req.headers['x-admin-token'] || ''
  if (!ADMIN_TOKEN) {
    return sendJSON(res, 503, { error: 'admin-token-not-configured' })
  }
  if (token !== ADMIN_TOKEN) {
    return sendJSON(res, 401, { error: 'unauthorized' })
  }
  const days = Number(url.searchParams.get('days')) || 14
  const end = url.searchParams.get('end') || null
  return sendJSON(res, 200, { generatedAt: Date.now(), days, series: dailySeries(days, end) })
}

function serveStatsPage(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const token = url.searchParams.get('token') || ''
  if (!ADMIN_TOKEN) {
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end('<h1>503 统计页未启用</h1><p>生产环境需在环境变量中设置 ADMIN_TOKEN 后才能访问访客统计页。</p>')
  }
  if (token !== ADMIN_TOKEN) {
    res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end('<h1>401 未授权</h1><p>请使用正确的 token 参数访问：/stats?token=YOUR_TOKEN</p>')
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(STATS_HTML)
}

// 绑定 0.0.0.0：容器 / PaaS 部署必需（默认只监听 localhost 时外部无法访问）
server.listen(PORT, '0.0.0.0', () => {
  const mode = DIST_EXISTS ? 'production(serve dist)' : 'api-only'
  console.log(
    `[chat-proxy] listening on http://0.0.0.0:${PORT}  mode=${mode}  model=${MODEL}  key=${API_KEY ? 'set' : 'MISSING'}  wechat=${wechatEnabled() ? 'on' : 'off'}`
  )
  if (!ADMIN_TOKEN) {
    console.warn('[stats] 警告：未设置 ADMIN_TOKEN，访客统计页处于无密码开放状态，任何人都可查看访客 IP。生产环境请务必在 .env 或环境变量中设置 ADMIN_TOKEN！')
  }
})
