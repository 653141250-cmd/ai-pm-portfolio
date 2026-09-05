// 共享常量与小组件（首页 iframe 与项目子页共用，集中避免重复）
export const NAME = '高志智'
export const AVATAR_INITIALS = 'GZ'
export const CITY = '南京'
export const EMAIL = '653141250@qq.com'
export const WECHAT = '18061479808'
// 项目演示地址：填入真实可访问链接（以 http(s) 开头）即展示「查看完整项目」入口；
// 留空则不展示入口，避免误点 `#` 锚点跳走当前页面。
export const PROJECT_DEMO_URL = ''

export const Dot = () => <span className="dot">.</span>

export const isMobileUA = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

export function ContactLink({ className, children, href = `mailto:${EMAIL}` }) {
  return (
    <a
      className={className}
      href={href}
      onClick={(e) => {
        if (isMobileUA()) {
          e.preventDefault()
          window.location.href = `tel:${WECHAT}`
        }
      }}
    >
      {children}
    </a>
  )
}
