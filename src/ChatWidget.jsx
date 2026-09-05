import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getReply, QUICK_QUESTIONS } from '../server/chatKnowledge'
import { reportChat, VISITOR_ID } from './tracking'
import { fetchReply, isBackendConfigured } from './chatApi'
import AVATAR_IMG from './assets/assistant-avatar.png'

const ASSISTANT = 'Ai答疑小蜜'

const WELCOME =
  `嗨～我是志智姐姐的 ${ASSISTANT} 呀！👋\n我可以带你快速了解她的 AI 产品经历、技能和联系方式～下面列了几个常见问题，也可以直接问我哦～`

function ChatBubble({ role, text }) {
  return (
    <div className={'chat-msg ' + role}>
      {role === 'bot' && <img className="chat-ava" src={AVATAR_IMG} alt="" aria-hidden="true" />}
      <div className="chat-bubble">
        {text.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </div>
  )
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ role: 'bot', text: WELCOME }])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bodyRef = useRef(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    // 动画头像随主包一起加载，这里预取以加速首次打开聊天窗口时的显示
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = AVATAR_IMG
    document.head.appendChild(link)
    return () => { document.head.removeChild(link) }
  }, [])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, typing, open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current && inputRef.current.focus(), 220)
    return () => clearTimeout(timerRef.current)
  }, [open])

  // 仅用户主动点关闭才收起；不清除 messages，聊天记录会保留到下次打开。
  const close = () => {
    setOpen(false)
  }

  const send = async (raw) => {
    const text = (raw != null ? raw : input).trim()
    if (!text || typing) return
    const next = [...messages, { role: 'user', text }]
    setMessages(next)
    setInput('')
    setTyping(true)

    // 优先走后端 LLM 接口（携带访客 ID 以读取长期记忆）；未配置 / 失败则回退本地简历知识库
    let reply = null
    if (isBackendConfigured()) {
      reply = await fetchReply(next, text, VISITOR_ID)
    }
    if (!reply) reply = getReply(text)

    // 埋点：把提问与回复上报到后端分析（含 visitorId，用于长期记忆与统计）
    try { reportChat(text, reply) } catch (e) {}

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setTyping(false)
      setMessages((m) => [...m, { role: 'bot', text: reply }])
    }, 480)
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const showPanel = open

  return (
    <>
      <button
        className={'nav-chat-trigger' + (open ? ' active' : '')}
        onClick={() => {
          if (open) close()
          else setOpen(true)
        }}
        aria-label="打开 AI 答疑小助手"
        title={ASSISTANT}
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H9l-4 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M8.5 8.5h7M8.5 11.5h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span>{ASSISTANT}</span>
      </button>

      {showPanel && createPortal(
        <div
          className="chat-panel"
          role="dialog"
          aria-label="AI 答疑小助手对话窗口"
        >
          <div className="chat-header">
            <img className="chat-ava chat-ava--lg" src={AVATAR_IMG} alt="" aria-hidden="true" />
            <div className="chat-head-text">
              <b>{ASSISTANT}</b>
              <span className="chat-status">
                <i className="chat-dot" /> 在线 · 简历答疑
              </span>
            </div>
            <button className="chat-close" onClick={close} aria-label="关闭">
              ✕
            </button>
          </div>

          <div className="chat-body" ref={bodyRef}>
            {messages.map((m, i) => (
              <ChatBubble key={i} role={m.role} text={m.text} />
            ))}
            {typing && (
              <div className="chat-msg bot">
                <img className="chat-ava" src={AVATAR_IMG} alt="" aria-hidden="true" />
                <div className="chat-bubble chat-typing">
                  <i /><i /><i />
                </div>
              </div>
            )}

            {messages.length <= 1 && (
              <div className="chat-quick">
                {QUICK_QUESTIONS.map((q, i) => (
                  <button key={i} className="chat-chip" onClick={() => send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="chat-input-row">
            <input
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="问问 AI 产品经历、技能或联系方式…"
              maxLength={200}
            />
            <button className="chat-send" onClick={() => send()} aria-label="发送" disabled={!input.trim() || typing}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M4 12l15-7-7 15-2.5-5.5L4 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
