// 后端 LLM 接口调用封装。
//
// 安全约定（重要）：
// - 真实后端地址从环境变量 VITE_CHAT_API_URL 读取，绝不写死在本文件里，
//   因此也不会出现在前端源码 / Git 提交中。
// - 前端只持有「你自己后端」的地址；LLM 的 API Key / 模型配置只存在于后端，
//   绝不下发到浏览器。这样即使他人查看打包产物，也拿不到任何密钥。
// - 若环境变量未配置（即没接后端），调用方应回退到本地简历知识库 getReply()。

// Vite 在构建时把 .env 中以 VITE_ 开头的变量注入到 import.meta.env。
// 本地值写在 .env.local（已被 .gitignore 忽略）；示例见 .env.example。
// 默认走同源 /api/chat（开发期由 Vite 代理转发到后端 8787）；
// 生产环境可用 VITE_CHAT_API_URL 覆盖为「你自己的后端域名」，
// 例如 VITE_CHAT_API_URL=https://your-server.example.com/api/chat
//
// 安全护栏：若 VITE_CHAT_API_URL 被误配成「裸 LLM 厂商端点」
//（如 open.bigmodel.cn / api.openai.com 的 /chat/completions），
// 前端会直接把对话发到厂商并可能暴露密钥域名，因此强制回退到同源 /api/chat，
// 由后端持有真实密钥转发。LLM 密钥绝不下发浏览器。
const RAW_CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL || ''
const LOOKS_LIKE_RAW_LLM = /chat\/completions|(\/v\d+\/?$)|bigmodel|openai|anthropic|dashscope|moonshot/.test(
  RAW_CHAT_API_URL
)
const CHAT_API_URL = LOOKS_LIKE_RAW_LLM ? '/api/chat' : RAW_CHAT_API_URL || '/api/chat'

export const isBackendConfigured = () => CHAT_API_URL.trim().length > 0

/**
 * 调用后端 LLM 接口，返回助手回复文本。
 * @param {{role:string,text:string}[]} history 完整对话历史（含系统约束由后端注入）
 * @param {string} message 用户最新一条消息
 * @param {string} [visitorId] 访客稳定 ID，用于后端读取该访客的长期记忆（避免重复回答）
 * @returns {Promise<string|null>} 成功返回文本；未配置 / 失败返回 null（由上层回退本地）
 */
export async function fetchReply(history, message, visitorId) {
  if (!isBackendConfigured()) return null
  try {
    const res = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // 仅下发对话内容 + 访客 ID，不下发任何密钥或系统提示词常量
      body: JSON.stringify({ message, history, visitorId }),
    })
    if (!res.ok) return null
    const data = await res.json()
    // 后端约定返回 { reply } 或 { answer }
    const reply = data && (data.reply ?? data.answer)
    if (typeof reply === 'string' && reply.trim()) return reply.trim()
    return null
  } catch (e) {
    // 网络/接口异常时静默回退，不阻塞用户
    return null
  }
}
