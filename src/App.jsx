import React, { useState, useEffect, useCallback, useRef, useLayoutEffect, Suspense, lazy } from 'react'
import { NAME, CITY, EMAIL, WECHAT, PROJECT_DEMO_URL, AVATAR_INITIALS, ContactLink, Dot, isMobileUA } from './portfolioShared'
// 项目子页分块（~94KB）：用 promise 缓存，便于「空闲预加载 / 导航悬停预热」共用同一次请求，
// 这样点击导航时分块已在内存中，页面能与页尾一次性同帧呈现，不再等网络。
let projectPagesPromise = null
const loadProjectPages = () => (projectPagesPromise ||= import('./ProjectPages'))
const ProjectPages = lazy(loadProjectPages)
import SpecularCard from './SpecularCard'
import ChatWidget from './ChatWidget'
import { initAnimations } from './animations'
import { initTracking } from './tracking'
// 懒加载：three.js (~600KB) 拆为独立 chunk，不阻塞首屏关键 JS
const MagicRings = lazy(() => import('./MagicRings'))


/* ====================== 首页：v0 静态作品集（iframe 隔离，不污染子页样式） ====================== */
function HomeFrame({ active = true }) {
  const iframeRef = useRef(null)
  const [showTop, setShowTop] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [ringsReady, setRingsReady] = useState(false)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    let cleanupScroll = () => {}

    const bindBackToTop = () => {
      const win = iframe.contentWindow
      if (!win) return
      const onScroll = () => setShowTop(win.scrollY > 500)
      onScroll()
      win.addEventListener('scroll', onScroll, { passive: true })
      cleanupScroll = () => win.removeEventListener('scroll', onScroll)
    }

    const onReady = () => {
      bindBackToTop()
      setIframeLoaded(true)
    }

    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
      onReady()
    } else {
      iframe.onload = onReady
    }

    return () => {
      iframe.onload = null
      cleanupScroll()
    }
  }, [])

  // 头图(MagicRings)与 iframe 均就绪后，给 iframe 发信号，让其胶囊标签在头图之后揭示
  useEffect(() => {
    if (!iframeLoaded || !ringsReady) return
    const t = setTimeout(() => {
      const win = iframeRef.current && iframeRef.current.contentWindow
      if (win) win.postMessage({ source: 'home-parent', type: 'bg-ready' }, '*')
    }, 350)
    return () => clearTimeout(t)
  }, [iframeLoaded, ringsReady])

  // WebGL 背景的挂载跟随 active，但「卸载」延后执行：
  // three.js 的 dispose / loseContext 是同步开销，若与路由切换同帧执行会明显掉帧。
  // 延后到新页面绘制完成之后再释放 GPU，跳转因此顺滑，且仍不会让 WebGL 在子页空转。
  const [bgMounted, setBgMounted] = useState(active)
  useEffect(() => {
    if (active) {
      setBgMounted(true)
      return
    }
    const t = setTimeout(() => setBgMounted(false), 300)
    return () => clearTimeout(t)
  }, [active])

  // 重新进入首页时，把 iframe 内部滚动归零，使整页从首屏开始（iframe 未重载，需手动复位）
  useEffect(() => {
    if (active && iframeRef.current) {
      const win = iframeRef.current.contentWindow
      if (win) { try { win.scrollTo(0, 0) } catch (e) {} }
    }
  }, [active])

  return (
    <>
      {/* 首屏背景：MagicRings（React Bits）WebGL 辉光环，置于 iframe 之后透出。
          仅在「首页且为当前展示路由」时挂载，离开首页后卸载以释放 GPU；
          iframe 本身始终保留在 DOM 中，回首页不再重新加载、不再重播开场动画。 */}
      <div className={'home-bg' + (active ? '' : ' hidden')} aria-hidden="true">
        {bgMounted && (
          <Suspense fallback={null}>
          <MagicRings
            color="#84CC16"
            colorTwo="#06B6D4"
            ringCount={6}
            speed={1}
            attenuation={10}
            lineThickness={2}
            baseRadius={0.35}
            radiusStep={0.1}
            scaleRate={0.1}
            opacity={1}
            blur={0}
            noiseAmount={0.1}
            rotation={0}
            ringGap={1.5}
            fadeIn={0.7}
            fadeOut={0.5}
            followMouse={false}
            mouseInfluence={0.2}
            hoverScale={1.2}
            parallax={0.05}
            clickBurst={false}
            alphaMode="luminance"
            onReady={() => setRingsReady(true)}
          />
          </Suspense>
        )}
      </div>
      <div className={'home-frame' + (active ? '' : ' hidden')}>
        <iframe ref={iframeRef} className="home-iframe" src="/portfolio.html" title="作品集首页" />
      </div>
      {active && (
        <button
          className={'back-to-top' + (showTop ? ' show' : '')}
          onClick={() => iframeRef.current?.contentWindow?.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="回到顶部"
          title="回到顶部"
        >
          ↑
        </button>
      )}
    </>
  )
}


/* ====================== NAV ====================== */
const NAV_ITEMS = [
  { id: 'top', label: '首页' },
  { id: 'project-1', label: 'AI 合同审核' },
  { id: 'project-2', label: '智能客服' },
  { id: 'project-3', label: 'AI 标书撰写' },
  { id: 'project-4', label: 'AI 发票审核' },
]

function Nav() {
  const [active, setActive] = useState('top')

  useEffect(() => {
    const ids = NAV_ITEMS.map(i => i.id)
    const compute = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash && ids.includes(hash)) return setActive(hash)
      const scrollY = window.scrollY + 120
      let current = 'top'
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= scrollY) current = id
      }
      setActive(current)
    }
    compute()
    window.addEventListener('scroll', compute, { passive: true })
    window.addEventListener('hashchange', compute)
    return () => {
      window.removeEventListener('scroll', compute)
      window.removeEventListener('hashchange', compute)
    }
  }, [])

  const handleNavClick = (e, id) => {
    e.preventDefault()
    // 仅切换 hash；滚动归零与内容切换由 App 的转场控制器在「覆盖」阶段统一处理，
    // 避免在揭幕前出现突兀的跳动。
    if (window.location.hash.replace('#', '') === id) {
      // 点击当前页锚点：直接平滑回顶，不触发整页转场
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.location.hash = `#${id}`
    }
  }

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <a href="#top" className="brand" onClick={(e) => handleNavClick(e, 'top')}>
          <span className="brand-avatar">{AVATAR_INITIALS}</span>
          <span className="brand-name">{NAME}</span>
        </a>
        <div className="nav-links">
          {NAV_ITEMS.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={active === item.id ? 'active' : ''}
              onClick={(e) => handleNavClick(e, item.id)}
              // 悬停/触摸即预热子页分块，兜底空闲预加载尚未完成的情况
              onPointerEnter={item.id === 'top' ? undefined : loadProjectPages}
            >
              {item.label}
            </a>
          ))}
          <ChatWidget />
        </div>
      </div>
    </nav>
  )
}




/* ====================== PROJECT DETAIL MODAL ====================== */
const CONTRACT_SHOTS = [
  { label: '上传合同', src: '/screenshots/contract-upload.webp', alt: '上传合同' },
  { label: '解析进度', src: '/screenshots/step-progress.webp', alt: '4 步骤解析进度 74%' },
  { label: '审查摘要', src: '/screenshots/review-summary.webp', alt: '审查完成 · 5 条意见' },
  { label: '风险详情', src: '/screenshots/risk-detail.webp', alt: '合同原文 vs 风险与修改意见' },
]

function ProjectModal({ onClose, onShotClick }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const onBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div className="modal-backdrop" onClick={onBackdrop}>
      <div className="modal-shell" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="meta">
            <span><b>PROJECT</b> · 01 / AI 合同审核</span>
            <span>2025.03 — 2025.09</span>
            <span>● LIVE PREVIEW</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="关闭">✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <div className="modal-section-head">
              <span className="num">— 01</span>
              <h3>产品概览</h3>
              <span className="line" />
            </div>
            <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.8, maxWidth: 760 }}>
              基于 Coze Workflow 编排的 AI 合同审核工具，从合同上传、智能解析、风险条款识别到报告生成一条链路打通。
              已服务 3 家种子客户，单份审核时间从 45 分钟降至 8 分钟，识别准确率 92%。
            </p>
          </div>

          <div className="modal-section">
            <div className="modal-section-head">
              <span className="num">— 02</span>
              <h3>运行截图</h3>
              <span className="line" />
            </div>
            <div className="gallery-meta">
              <span>共 <b>4</b> 张 · 核心界面</span>
              <span style={{ color: 'var(--muted)' }}>提示：点击外部或按 ESC 关闭</span>
            </div>
            <div className="shot-gallery">
              {CONTRACT_SHOTS.map((s, i) => (
                <div
                  key={i}
                  className="shot-big"
                  data-label={s.label}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onShotClick && onShotClick(CONTRACT_SHOTS, i); }}
                >
                  <img src={s.src} alt={s.alt} loading="lazy" decoding="async" />
                </div>
              ))}
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-head">
              <span className="num">— 03</span>
              <h3>技术栈</h3>
              <span className="line" />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {['Coze Workflow', 'Cursor', 'Vibe Coding', 'Tool Use', '飞书 Webhook', 'PDF Parse'].map(t => (
                <span key={t} style={{
                  padding: '8px 14px', border: '1px solid var(--border-2)', borderRadius: 999,
                  fontSize: 12, letterSpacing: '0.06em', color: 'var(--text-2)'
                }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <div className="left">
            {PROJECT_DEMO_URL ? (
              <div className="hint">
                <b>查看完整项目 →</b> 上方为产品核心界面预览，完整 demo / 录屏 / 部署地址：
                <a href={PROJECT_DEMO_URL} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', marginLeft: 6, borderBottom: '1px dashed var(--accent)' }}>
                  {PROJECT_DEMO_URL}
                </a>
              </div>
            ) : (
              <div className="hint">上方为产品核心界面预览。如需完整 demo / 录屏，可直接电话 {WECHAT} 联系志智姐姐。</div>
            )}
          </div>
          {PROJECT_DEMO_URL && (
            <a className="btn btn-primary" href={PROJECT_DEMO_URL} target="_blank" rel="noreferrer">
              查看完整项目 <span style={{ fontSize: 14 }}>↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/* ====================== BACK TO TOP ====================== */
function BackToTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  return (
    <button
      className={'back-to-top' + (show ? ' show' : '')}
      onClick={toTop}
      aria-label="回到顶部"
      title="回到顶部"
    >
      ↑
    </button>
  )
}

/* ====================== 路由辅助 ====================== */
const PROJECT_ROUTES = ['project-1', 'project-2', 'project-3', 'project-4']
let __initialLoad = true
function getRoute() {
  const h = window.location.hash.replace('#', '')
  if (__initialLoad) return 'home' // 刷新/直开：始终从首页起，不记忆深层子页
  return PROJECT_ROUTES.includes(h) ? h : 'home'
}

/* ====================== 项目子页面 ====================== */

/* ====================== APP ====================== */
function Lightbox({ images, index, onClose, onChange }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onChange((index - 1 + images.length) % images.length)
      else if (e.key === 'ArrowRight') onChange((index + 1) % images.length)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [images, index, onClose, onChange])
  if (!images || !images.length) return null
  const img = images[index]
  const multi = images.length > 1
  const go = (dir) => onChange((index + dir + images.length) % images.length)
  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button className="lightbox-close" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="关闭">✕</button>
      {multi && (
        <button className="lightbox-nav lightbox-prev" onClick={(e) => { e.stopPropagation(); go(-1) }} aria-label="上一张">‹</button>
      )}
      <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
        <img src={img.src} alt={img.label} className="lightbox-img" />
        <div className="lightbox-meta">
          <div className="lightbox-label">{img.label}</div>
          {multi && <div className="lightbox-count">{index + 1} / {images.length}</div>}
        </div>
      </div>
      {multi && (
        <button className="lightbox-nav lightbox-next" onClick={(e) => { e.stopPropagation(); go(1) }} aria-label="下一张">›</button>
      )}
    </div>
  )
}

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [route, setRoute] = useState(getRoute) // 当前路由（来自 hash）
  const [pagesReady, setPagesReady] = useState(false) // 子页分块是否已就绪
  const rootRef = useRef(null)
  const open = useCallback(() => setModalOpen(true), [])
  const close = useCallback(() => setModalOpen(false), [])
  const openShot = useCallback((images, index = 0) => setLightbox({ images, index }), [])
  const closeShot = useCallback(() => setLightbox(null), [])
  const setLightboxIndex = useCallback((index) => setLightbox(prev => prev ? { ...prev, index } : prev), [])

  useEffect(() => {
    // 刷新/直开后默认停首页：清掉地址栏里可能残留的深层路由 hash，
    // 并解除「首屏忽略 hash」标记，之后点击导航才会真正切到子页。
    if (__initialLoad && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    __initialLoad = false
    initTracking()
  }, [])

  // 子页分块预热：首屏绘制完成后趁主线程空闲拉取；若用户先点了导航则立即拉取。
  // 目的——点击跳转时分块已在内存里，页面内容与页尾能同帧呈现，
  // 不再出现「先空白、页尾独自浮在页头、随后内容才撑开」的错位闪现。
  useEffect(() => {
    if (pagesReady) return
    let cancelled = false
    const markReady = () => { if (!cancelled) setPagesReady(true) }
    if (route !== 'home') {
      loadProjectPages().then(markReady, markReady)
      return () => { cancelled = true }
    }
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => loadProjectPages().then(markReady, markReady), { timeout: 2000 })
      : window.setTimeout(() => loadProjectPages().then(markReady, markReady), 800)
    return () => {
      cancelled = true
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle)
      else window.clearTimeout(idle)
    }
  }, [route, pagesReady])

  useEffect(() => {
    const onHash = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHash)
    return () => {
      window.removeEventListener('hashchange', onHash)
    }
  }, [])

  // 路由切换：直接替换内容并瞬间归零滚动（无黑幕，跳转干脆利落、绝不闪黑）
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  // 子页内容是否已可渲染（首页无需等分块）
  const contentReady = route === 'home' || pagesReady

  // 路由变化后重新初始化 GSAP 时间线。
  // 必须等子页 DOM 真正挂载才执行，否则查询不到任何元素——
  // 既会让子页失去滚动揭示动效，也会让此刻孤零零位于页头的页尾被 ScrollTrigger 立即触发而闪现。
  useLayoutEffect(() => {
    if (!contentReady) return
    const ctx = initAnimations(rootRef.current, route)
    return () => { if (ctx) ctx.revert() }
  }, [route, contentReady])

  return (
    <div className="page-root" ref={rootRef}>
      <Nav />
      {/* 首页 iframe 始终保留在 DOM，离开时仅隐藏，回首页不再重载、不再重播开场 */}
      <HomeFrame active={route === 'home'} />
      {/* 页尾与「回到顶部」必须与子页内容同时出现：
          若在分块加载完成前就渲染，它们会孤立地停在页头造成文本闪现。 */}
      {route !== 'home' && route.startsWith('project') && contentReady && (
        <>
          <Suspense fallback={null}>
            <ProjectPages route={route} onOpenShots={open} onShotClick={openShot} />
          </Suspense>
          <div className="container">
            <div className="foot">
              <span>© 2026 {NAME} · <span className="accent">AI PM</span> PORTFOLIO</span>
              <span>BUILT WITH REACT + VITE</span>
            </div>
          </div>
          <BackToTop />
        </>
      )}
      {modalOpen && <ProjectModal onClose={close} onShotClick={openShot} />}
      {lightbox && <Lightbox images={lightbox.images} index={lightbox.index} onClose={closeShot} onChange={setLightboxIndex} />}
    </div>
  )
}
