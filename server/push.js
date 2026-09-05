// 微信即时提醒：封装 Server酱（ServerChan）推送。
// 注意：必须在 loadEnv() 之后才能拿到 SERVERCHAN_KEY，因此这里**懒加载**读取
// 环境变量（不在模块顶层求值），避免 ES import 先于 loadEnv() 执行导致读到空串。
function getKey() {
  return process.env.SERVERCHAN_KEY || ''
}

/**
 * 推送一条消息到微信（Server酱）。
 * 未配置 SERVERCHAN_KEY 时降级为控制台日志，不报错、不阻塞。
 * @param {string} title 标题（建议 ≤ 100 字）
 * @param {string} desp 正文，支持 Markdown
 * @returns {Promise<boolean>} 是否推送成功
 */
export function pushWechat(title, desp = '') {
  const KEY = getKey()
  if (!KEY) {
    console.log('[push:wechat] (未配置 SERVERCHAN_KEY，跳过推送) ', title)
    return Promise.resolve(false)
  }
  const url = `https://sctapi.ftqq.com/${KEY}.send`
  try {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.slice(0, 100), desp: desp.slice(0, 30000) }),
    })
    .then((r) => {
      if (r.ok) console.log('[push:wechat] 推送成功 ✅', title)
      else console.error('[push:wechat] 推送被服务端拒绝 (http', r.status, ')', title)
      return r.ok
    })
    .catch((e) => {
        console.error('[push:wechat] 推送失败', e)
        return false
      })
  } catch (e) {
    console.error('[push:wechat] 异常', e)
    return Promise.resolve(false)
  }
}

/** 微信推送是否已启用（懒读取，供启动日志使用）。 */
export function wechatEnabled() {
  return Boolean(getKey())
}
