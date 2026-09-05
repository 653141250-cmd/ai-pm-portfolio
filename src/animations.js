import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
gsap.config({ force3D: true, nullTargetWarn: false })

// 高级感缓动：expo.out 收尾丝滑、慢节奏
const EASE = 'expo.out'

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 在 root 作用域内初始化全部动效，返回一个 gsap.context 便于路由切换时整体还原。
 * @param {HTMLElement} root 页面根容器
 * @param {string} route 当前路由（home / project-1..4）
 */
export function initAnimations(root, route) {
  if (!root) return null

  // 无障碍：尊重「减少动态效果」，直接显示内容、不挂任何动画
  if (prefersReduced()) {
    return null
  }

  const isProject = typeof route === 'string' && route.indexOf('project') === 0
  // 项目子页用更短时长，切换更干脆；首页保持原有高级慢节奏
  const D = isProject
    ? { nav: 0.45, display: 0.7, sub: 0.6, card: 0.7, cardStagger: 0.08, cardVisual: 0.7 }
    : { nav: 0.9, display: 1.25, sub: 1.0, card: 1.05, cardStagger: 0.12, cardVisual: 1.1 }

  const ctx = gsap.context(() => {
    /* ---------------- 导航：每路由轻量淡入 ---------------- */
    gsap.from('.nav', { y: -28, opacity: 0, duration: D.nav, ease: EASE, delay: 0.05 })

    /* ---------------- 首屏 OPENING ----------------
       首页的 opening / 滚动动效改由 iframe 内的 portfolio.html 自行播放
       （GSAP + ScrollTrigger：标题遮罩揭开 + 纵向压缩后归位 + 卡片 stagger + 图片 reveal/parallax），
       父层不再叠加 curtain，避免双层动效冲突。导航轻量淡入保留。
       路由切换的「覆盖—揭开」转场由 App 的转场控制器统一负责，这里不再触碰 curtain。 */

    /* ---------------- 英文大标题：滚动到时大幅进场 ---------------- */
    root.querySelectorAll('.section-head .display, .contact-display').forEach((el) => {
      gsap.fromTo(
        el,
        {
          yPercent: 72,
          opacity: 0,
          scaleY: 1.18,
          transformOrigin: '0% 100%',
          clipPath: 'inset(100% 0% 0% 0%)',
        },
        {
          yPercent: 0,
          opacity: 1,
          scaleY: 1,
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: D.display,
          ease: EASE,
          scrollTrigger: { trigger: el, start: 'top 82%', once: true },
          onComplete: () => gsap.set(el, { clearProps: 'transform' }),
        }
      )
    })

    /* ---------------- 标题附属文案 / 信息面板：随标题轻微跟进 ---------------- */
    root
      .querySelectorAll(
        '.section-head .eyebrow, .section-head .lead, .contact .eyebrow, .contact-lead, .contact .cta, .contact-info .contact-row'
      )
      .forEach((el) => {
        const trig = el.closest('.section') || el.closest('.contact') || el
        gsap.from(el, {
          y: 30,
          opacity: 0,
          duration: D.sub,
          ease: EASE,
          scrollTrigger: { trigger: trig, start: 'top 85%', once: true },
        })
      })

    /* ---------------- 卡片：进入视口后依次 stagger 出现 ---------------- */
    root.querySelectorAll('.cards').forEach((grid) => {
      const cards = grid.querySelectorAll('.card')
      if (!cards.length) return
      ScrollTrigger.batch(cards, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) =>
          gsap.fromTo(
            batch,
            { y: 70, opacity: 0, scale: 0.97 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: D.card,
              ease: EASE,
              stagger: D.cardStagger,
              overwrite: true,
              onComplete: () => gsap.set(batch, { clearProps: 'transform' }),
            }
          ),
      })
    })

    /* ---------------- 卡片视觉：reveal（自下而上揭开） ---------------- */
    root.querySelectorAll('.card-visual').forEach((el) => {
      const trig = el.closest('.card') || el
      gsap.fromTo(
        el,
        { yPercent: 10, opacity: 0, clipPath: 'inset(100% 0% 0% 0%)' },
        {
          yPercent: 0,
          opacity: 1,
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: D.cardVisual,
          ease: EASE,
          scrollTrigger: { trigger: trig, start: 'top 85%', once: true },
        }
      )
    })

    /* ---------------- 页脚 ---------------- */
    const foot = root.querySelector('.foot')
    if (foot) {
      gsap.from(foot, {
        y: 30,
        opacity: 0,
        duration: 1.0,
        ease: EASE,
        scrollTrigger: { trigger: foot, start: 'top 96%', once: true },
      })
    }
  }, root)

  // 字体/图片加载后重新计算触发点，避免错位
  requestAnimationFrame(() => ScrollTrigger.refresh())
  return ctx
}
