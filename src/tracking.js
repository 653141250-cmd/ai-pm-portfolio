// 前端访客埋点模块。
// - 生成稳定 visitorId（localStorage 持久），用于跨页面/会话识别同一访客
// - 采集：站点进入(reportVisit=visit)、SPA 路由切换(pageview+pageleave，含各页驻留时长)、
//        页面卸载总驻留(reportLeave)、AI 答疑提问+回复(reportChat)
// - 上报到同源 /api/track；优先 sendBeacon（页面卸载也能送达），失败回退 fetch(keepalive)
// 该模块零依赖，报错被吞掉，绝不阻塞页面交互。
const STORAGE_KEY = 'ga_visitor_id'

function getVisitorId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch (e) {
    return 'anon-' + Date.now().toString(36)
  }
}

export const VISITOR_ID = getVisitorId()
let curPath = location.pathname + location.hash
let curEnter = Date.now()
let left = false

function currentPath() {
  return location.pathname + location.hash
}

function post(type, extra) {
  const payload = Object.assign(
    {
      type,
      visitorId: VISITOR_ID,
      ua: navigator.userAgent,
      ref: document.referrer,
      path: currentPath(),
    },
    extra || {}
  )
  const body = JSON.stringify(payload)
  if (navigator.sendBeacon) {
    try {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))
      return
    } catch (e) {
      /* fallthrough to fetch */
    }
  }
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

export function reportVisit() {
  post('visit')
}

// 结算当前页驻留，并切换到新页面（用于 SPA 路由切换）
function firePageLeave() {
  const dur = Math.max(0, Math.round((Date.now() - curEnter) / 1000))
  post('pageleave', { path: curPath, duration: dur })
}

function onRouteChange() {
  const np = currentPath()
  if (np === curPath) return // 路径未变，忽略（兼容 hashchange/popstate/轮询重复触发）
  if (!left) firePageLeave() // 结算上一页驻留
  curPath = np
  curEnter = Date.now()
  post('pageview', { path: curPath })
}

export function reportLeave() {
  if (left) return
  left = true
  if (!document.hidden) firePageLeave() // 页面仍可见时（如 beforeunload）结算当前页
}

export function reportChat(question, answer) {
  post('chat', {
    question: String(question == null ? '' : question).slice(0, 500),
    answer: String(answer == null ? '' : answer).slice(0, 2000),
  })
}

export function initTracking() {
  reportVisit()
  // 路由变化检测：SPA 用 hash 切换，hashchange/popstate 立即响应，无需轮询
  window.addEventListener('hashchange', onRouteChange)
  window.addEventListener('popstate', onRouteChange)
  // 隐藏/卸载时结算当前页驻留
  const onHide = () => {
    if (document.visibilityState === 'hidden') reportLeave()
  }
  document.addEventListener('visibilitychange', onHide)
  window.addEventListener('pagehide', reportLeave)
  window.addEventListener('beforeunload', reportLeave)
}
