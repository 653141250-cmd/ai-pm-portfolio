import React from 'react'
import SpecularCard from './SpecularCard'
import { NAME, CITY, EMAIL, WECHAT, PROJECT_DEMO_URL, ContactLink, Dot, isMobileUA } from './portfolioShared'

/* ====================== 8 CARDS（来自首页项目一） ====================== */
const cards = [
  { num:'01', title:'项目背景', kind:'pain',
    desc:'为某中小商贸公司解决“合同审核耗时、易漏、依赖法务个人经验”的痛点。' },
  { num:'02', title:'需求分析', kind:'req',
    desc:'调研 2 家目标企业，梳理合同从上传、解析、风险条款提取到报告生成的全流程需求。' },
  { num:'03', title:'Coze 流程图', kind:'coze', wide: true,
    desc:'在 Coze 上编排工作流：触发器 → 文件读取 → LLM 解析 → Tool use 风险识别 → 代码汇总 → 飞书通知 → 人工兜底，一条可观测、可干预的端到端流。' },
  { num:'04', title:'Prompt 设计模版', kind:'prompt', tall: true,
    desc:'为风险条款识别设计的结构化 Prompt，含角色、上下文、约束与输出 JSON Schema。' },
  { num:'05', title:'运行截图', kind:'shots', openable:true,
    desc:'产品核心界面：上传、解析进度、风险高亮、在线报告预览。点击浏览完整运行截图与项目详情。' },
  { num:'06', title:'客户反馈', kind:'quotes',
    desc:'来自 3 家种子客户试用期的真实反馈，覆盖法务、业务、运营三类角色。' },
  { num:'07', title:'上线效果', kind:'metrics', wide: true,
    desc:'关键指标对比：审核效率、风险识别准确率、覆盖客户数与试运行反馈。' },
]

function CardVisual({ kind, onShotClick }) {
  if (kind === 'pain') {
    return (
      <div className="card-visual">
        <div className="pain-stat">
          <div className="v">45<small>min</small></div>
          <div className="arrow">→</div>
          <div className="v acc">8<small>min</small></div>
        </div>
        <div className="pain-label">单份合同平均审核时长</div>
      </div>
    )
  }
  if (kind === 'req') {
    const items = [
      '合同上传与多格式兼容（PDF / Word / 图片 OCR）',
      '关键条款自动抽取与结构化',
      '风险条款识别 + 严重度分级',
      '审核报告生成与在线预览',
      '权限分级与审计日志',
    ]
    return (
      <div className="card-visual">
        <div className="req-list">
          {items.map((t, i) => (
            <div key={i} className="req-item">
              <span className="n">{String(i+1).padStart(2,'0')}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (kind === 'coze') {
    // 4 上 + 3 下 蛇形流；bottom 行 DOM 顺序为 [7,6,5]，箭头 ←，呈现"右 → 左"
    const top = [
      { i: 1, t: '触发',              d: 'Webhook / 手动',       s: 'start' },
      { i: 2, t: '文件读取',          d: 'WORD',                 tag: 'IO' },
      { i: 3, t: '解析节点',          d: 'LLM · 解析合同主体',   tag: 'LLM' },
      { i: 4, t: 'Tool use',          d: '风险识别',             s: 'tool', tag: 'TOOL' },
    ]
    const bottom = [
      { i: 7, t: 'Human-in-the-loop', d: '人工兜底',             s: 'human', tag: 'HUMAN' },
      { i: 6, t: '飞书通知',          d: '协作交付' },
      { i: 5, t: '代码节点',          d: '数据汇总',             tag: 'CODE' },
    ]
    const Node = ({ n }) => {
      const mod = n.s || n.tag?.toLowerCase()
      return (
        <div className={'coze-n' + (mod ? ' coze-n--' + mod : '')}>
          {n.tag && <span className="coze-tag">{n.tag}</span>}
          <div className="coze-n-t">{n.t}</div>
          <div className="coze-n-d">{n.d}</div>
        </div>
      )
    }
    return (
      <div className="card-visual">
        <div className="coze-flow">
          <div className="coze-row">
            {top.map((n, idx) => (
              <React.Fragment key={n.i}>
                {idx > 0 && <span className="coze-arr">→</span>}
                <Node n={n} />
              </React.Fragment>
            ))}
          </div>
          <div className="coze-down" aria-hidden="true">↓</div>
          <div className="coze-row">
            {bottom.map((n, idx) => (
              <React.Fragment key={n.i}>
                {idx > 0 && <span className="coze-arr">←</span>}
                <Node n={n} />
              </React.Fragment>
            ))}
          </div>
          <div className="coze-legend">
            <span><i className="dot-i" /> Start / End</span>
            <span><i className="dot-i tool" /> Tool call</span>
            <span><i className="dot-i human" /> Human review</span>
          </div>
        </div>
      </div>
    )
  }
  if (kind === 'prompt') {
    return (
      <div className="card-visual">
        <div className="prompt">
          <div className="prompt-head"><i /><i /><i /></div>
          <div><span className="c"># 角色</span><br />
你是<span className="k">合同问题初筛助手</span>。你必须同时依据合同正文<span className="k">{'{{input}}'}</span>和本次审查要求<span className="k">{'{{xuqiu}}'}</span>进行检查。<span className="k">合同类型、审查立场、重点审查和补充要求</span>必须真实影响问题识别、风险分析与修改建议。</div>
          <div style={{ marginTop: 12 }}><span className="c"># 审查步骤</span><br />
1. 先读取<span className="k">{'{{xuqiu}}'}</span>，确认合同类型、审查立场、重点审查和补充要求。<br />
2. 仔细研读<span className="k">{'{{input}}'}</span>，优先检查重点审查事项，同时完成必要的通用条款检查。<br />
3. 从指定审查立场解释风险，<span className="k">不得把甲方和乙方的利益、义务混在一起</span>。<br />
4. 每个问题必须能够回到合同原文，<span className="k">不得编造合同中不存在的条款或事实</span>。<br />
5. 修改建议必须可执行；缺少完整事实或权威依据时，<span className="k">明确提示人工复核</span>。</div>
          <div style={{ marginTop: 12 }}><span className="c"># 固定输出格式</span><br />{`- 问题1：问题标题
  - `}<span className="k">分析：</span>{`基于合同原文和审查立场说明原因及影响
  - `}<span className="k">修改建议：</span>{`给出可执行修改方式
- 问题2：问题标题
  - `}<span className="k">分析：</span>{`……
  - `}<span className="k">修改建议：</span>{`……`}</div>
          <div style={{ marginTop: 12 }}><span className="c"># 限制</span><br />
- 只能使用上述固定 Markdown 格式，不得改变<span className="k">“问题、分析、修改建议”</span>的名称、顺序、中文冒号或缩进，不得增加开场白和总结。<br />
- 如果没有发现可明确判断的问题，只输出：<span className="k">未发现可明确判断的问题，仍需人工复核</span>。<br />
- <span className="k">不得编造法条号、司法案例或确定性法律结论</span>。<br />
- 输出用于合同问题初筛和修改讨论，<span className="k">不作为最终法律意见或签署决策</span>。</div>
        </div>
      </div>
    )
  }
  if (kind === 'shots') {
    const shots = [
      { label: '上传合同', src: '/screenshots/contract-upload.webp', alt: '上传合同界面' },
      { label: '解析进度', src: '/screenshots/step-progress.webp', alt: '4 步骤解析进度 74%' },
      { label: '审查摘要', src: '/screenshots/review-summary.webp', alt: '审查完成 5 条意见' },
      { label: '风险详情', src: '/screenshots/risk-detail.webp', alt: '合同原文 vs 风险与修改意见' },
    ]
    return (
      <div className="card-visual">
        <div className="shots">
          {shots.map((s, i) => (
            <div
              key={i}
              className="shot"
              data-label={s.label}
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onShotClick && onShotClick(shots, i); }}
            >
              <img src={s.src} alt={s.alt} loading="lazy" decoding="async" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (kind === 'quotes') {
    const qs = [
      { q:'"风险条款基本都标出来了，原来 1 小时的工作现在 10 分钟过完。"', w:'— 某商贸公司 · 法务负责人' },
      { q:'"业务部门能自己先过一遍，法务只复核高风险，效率翻倍。"', w:'— 客户 · 业务总监' },
      { q:'"关键风险点都高亮出来了，跨部门对齐时大家看的是同一份结果。"', w:'— 客户 · 运营经理' },
    ]
    return (
      <div className="card-visual">
        {qs.map((x, i) => (
          <div key={i} className="quote-item">
            <div className="q">{x.q}</div>
            <div className="who">{x.w}</div>
          </div>
        ))}
      </div>
    )
  }
  if (kind === 'metrics') {
    const ms = [
      { v: <>45 → 8 <small>min</small></>, l: '单份合同审核时长' },
      { v: <>92<small>%</small></>, l: '风险条款识别准确率' },
      { v: <>3 <small>家</small></>, l: '种子客户试运行' },
      { v: <>A+</>, l: '客户综合满意度' },
    ]
    return (
      <div className="card-visual">
        <div className="metrics">
          {ms.map((m, i) => (
            <div key={i} className="metric">
              <span className="metric-val">{m.v}</span>
              <span className="metric-lbl">{m.l}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}


function Project({ onOpenShots, onShotClick }) {
  return (
    <>
      {/* HERO — 套用 Contact 页面风格 */}
      <section id="project-1" className="contact">
        <div className="container contact-inner">
          <div>
            <div className="eyebrow" style={{ marginBottom: 28 }}>Project 01 · 2025.03 — 2025.09</div>
            <h2 className="contact-display">AI<br />CONTRACT<br />REVIEW<Dot /></h2>
            <p className="contact-lead">
              从 0 到 1 搭建的 AI 合同审核工具。基于 Coze Workflow 编排 LLM 风险识别，用 Cursor / Vibe Coding 跑通 MVP 并部署上线，已服务 3 家种子客户。
            </p>
            <ContactLink className="cta">聊聊合作 →</ContactLink>
          </div>
          <div className="contact-info project-2-info">
            <div className="contact-row"><span className="k">CURRENTLY</span><span className="v">AI 合同审核 · 上线中</span></div>
            <div className="contact-row"><span className="k">STACK</span><span className="v">Coze + Cursor</span></div>
            <div className="contact-row"><span className="k">CITY</span><span className="v">{CITY}</span></div>
            <div className="contact-row"><span className="k">STATUS</span><span className="v" style={{ color: 'var(--accent)' }}>● 3 家种子客户试运行</span></div>
          </div>
        </div>
      </section>

      {/* 详情 — 7 模块卡片布局 */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2 className="display display-l">AI CONTRACT<br />REVIEW<Dot /></h2>
            </div>
          </div>

          <div className="cards">
            {cards.map(c => {
              const clickable = !!c.openable
              const isWide = !!c.wide
              const cls = 'card' + (clickable ? ' card-clickable' : '') + (isWide ? ' card-wide' : '') + (c.tall ? ' card-tall' : '')
              if (clickable) {
                return (
                  <SpecularCard key={c.num} className={cls} onClick={onOpenShots} interactive>
                    <div className="card-pill">CLICK · 浏览</div>
                    <div className="card-num">{c.num}</div>
                    <div className="card-title">{c.title}</div>
                    <div className="card-desc">{c.desc}</div>
                    <CardVisual kind={c.kind} onShotClick={onShotClick} />
                    <div className="card-cta">
                      <span className="arrow">→</span>
                      <span>浏览项目详情</span>
                    </div>
                  </SpecularCard>
                )
              }
              return (
                <SpecularCard key={c.num} className={cls}>
                  <div className="card-num">{c.num}</div>
                  <div className="card-title">{c.title}</div>
                  <div className="card-desc">{c.desc}</div>
                  <CardVisual kind={c.kind} onShotClick={onShotClick} />
                </SpecularCard>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}

/* ====================== PROJECT 02 · 智能客服 ====================== */
const cards2 = [
  { num:'01', title:'项目背景', kind:'cs-pain',
    desc:'电商平台客户对接人工客服等待时间长、回复慢；商户人工客服用工成本高，应对业务波动能力差，服务标准难以统一。' },
  { num:'02', title:'需求分析', kind:'cs-req',
    desc:'分析人工客服流程痛点，梳理用户场景，明确产品需求：秒级响应、全天候在线、标准化服务与人机协同。' },
  { num:'03', title:'Coze 流程图', kind:'cs-coze', wide: true,
    desc:'在 Coze 上编排 8 步工作流：用户输入 → 意图分类 → 订单参数提取 → Tool use → RAG 检索 → 回复生成 → 反思质检 → Human-in-the-loop，确保 AI 不乱编、不承诺、转人工。' },
  { num:'04', title:'Prompt 设计模版', kind:'cs-prompt', tall: true,
    desc:'为智能客服设计的结构化 Prompt，含角色、背景、目标、输出格式、示例与限制规则。' },
  { num:'05', title:'运行截图', kind:'cs-shots',
    desc:'产品核心界面：物流查询与购物推荐对话窗口，以及对应的 Coze 工作流编排。点击可放大浏览。' },
  { num:'06', title:'客户反馈', kind:'cs-quotes',
    desc:'来自 2 家种子客户试运行的真实反馈，覆盖客服、运营、管理等角色。（素材待补充）' },
  { num:'07', title:'上线效果', kind:'cs-metrics', wide: true,
    desc:'关键指标对比：会话处理占比、响应速度、服务时长与种子客户覆盖。' },
]

function CardVisual2({ kind, onShotClick }) {
  if (kind === 'cs-pain') {
    return (
      <div className="card-visual">
        <div className="pain-stat">
          <div className="v">分钟<small>级</small></div>
          <div className="arrow">→</div>
          <div className="v acc">秒级</div>
        </div>
        <div className="pain-label">平均首响时间</div>
        <div className="pain-stat" style={{ marginTop: 24 }}>
          <div className="v">5×8</div>
          <div className="arrow">→</div>
          <div className="v acc">7×24</div>
        </div>
        <div className="pain-label">服务覆盖时长</div>
      </div>
    )
  }
  if (kind === 'cs-req') {
    const items = [
      '秒级响应，降低用户排队等待',
      '7×24 全天候在线，应对业务波动',
      '统一服务标准，减少人工经验差异',
      '人机协同，复杂 / 越权问题转人工',
      '查订单、查物流等复杂业务接真实 API',
    ]
    return (
      <div className="card-visual">
        <div className="req-list">
          {items.map((t, i) => (
            <div key={i} className="req-item">
              <span className="n">{String(i+1).padStart(2,'0')}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (kind === 'cs-coze') {
    const top = [
      { i: 1, t: '用户输入', d: '文字', s: 'start' },
      { i: 2, t: '意图分类', d: '查询 / 推荐 / 售后 / 优惠 / 投诉', tag: 'LLM' },
      { i: 3, t: '订单参数提取', d: 'LLM 规则提取', tag: 'LLM' },
      { i: 4, t: 'Tool use', d: '查快递号 / 订单号 / 手机号', tag: 'TOOL' },
    ]
    const bottom = [
      { i: 8, t: 'Human-in-the-loop', d: '人工兜底', s: 'human', tag: 'HUMAN' },
      { i: 7, t: '反思质检', d: '边界复核不编 / 不承诺 / 转人工', tag: 'RULE' },
      { i: 6, t: '风格回复生成', d: 'LLM 组织回复答案', tag: 'LLM' },
      { i: 5, t: 'RAG 检索', d: '话术混合检索 + 重排', tag: 'RAG' },
    ]
    const Node = ({ n }) => {
      const mod = n.s || n.tag?.toLowerCase()
      return (
        <div className={'coze-n' + (mod ? ' coze-n--' + mod : '')}>
          {n.tag && <span className="coze-tag">{n.tag}</span>}
          <div className="coze-n-t">{n.t}</div>
          <div className="coze-n-d">{n.d}</div>
        </div>
      )
    }
    return (
      <div className="card-visual">
        <div className="coze-flow">
          <div className="coze-row">
            {top.map((n, idx) => (
              <React.Fragment key={n.i}>
                {idx > 0 && <span className="coze-arr">→</span>}
                <Node n={n} />
              </React.Fragment>
            ))}
          </div>
          <div className="coze-down" aria-hidden="true">↓</div>
          <div className="coze-row">
            {bottom.map((n, idx) => (
              <React.Fragment key={n.i}>
                {idx > 0 && <span className="coze-arr">←</span>}
                <Node n={n} />
              </React.Fragment>
            ))}
          </div>
          <div className="coze-legend">
            <span><i className="dot-i" /> Start</span>
            <span><i className="dot-i tool" /> Tool call</span>
            <span><i className="dot-i human" /> Human review</span>
          </div>
        </div>
      </div>
    )
  }
  if (kind === 'cs-prompt') {
    return (
      <div className="card-visual">
        <div className="prompt">
          <div className="prompt-head"><i /><i /><i /></div>
          <div>你是<span className="k">美食电商物流订单查询参数提取模块</span>。请从用户输入中提取物流订单查询所需参数。</div>
          <div style={{ marginTop: 12 }}><span className="c"># 可提取字段</span><br />
- <span className="k">order_id</span>：物流订单号，通常包含数字、字母，SN / DD / ORDER 等前缀。<br />
- <span className="k">phone_number</span>：手机号。<br />
- <span className="k">product_name</span>：用户提到的商品名称，例如酸辣粉、牛肉面、韭菜鸡蛋水饺、小汤包、烧卖等。<br />
- <span className="k">query_type</span>：用户想查什么。<br />
  - <span className="k">logistics</span>：物流 / 到哪里了<br />
  - <span className="k">shipping</span>：是否发货 / 什么时候发货<br />
  - <span className="k">delivery_time</span>：预计什么时候到<br />
  - <span className="k">general</span>：泛订单查询</div>
          <div style={{ marginTop: 12 }}><span className="c"># 字段规则</span><br />
- 提取到值：填写实际值。<br />
- 未提取到值：填写字符串 <span className="k">"null"</span>。</div>
          <div style={{ marginTop: 12 }}><span className="c"># 示例</span><br />{`{
  "order_id": "null",
  "phone_number": "13812345678",
  "product_name": "null",
  "query_type": "logistics"
}`}</div>
          <div style={{ marginTop: 12 }}><span className="c"># 判断规则</span><br />
- 有 <span className="k">order_id</span>，则 <span className="k">need_more_info = false</span>。<br />
- 没有 <span className="k">order_id</span>，但有 <span className="k">phone_number</span>，可以先尝试查询，<span className="k">need_more_info = false</span>。<br />
- <span className="k">order_id</span>、<span className="k">phone_number</span> 全都没有，则 <span className="k">need_more_info = true</span>。</div>
        </div>
      </div>
    )
  }
  if (kind === 'cs-shots') {
    const shots = [
      { label: '购物推荐对话', src: '/images/service/chat-recommend.webp', alt: '美食购物推荐对话窗口' },
      { label: '物流查询对话', src: '/images/service/chat-logistics.webp', alt: '订单物流查询对话窗口' },
      { label: '物流查询工作流', src: '/images/service/workflow-logistics.webp', alt: '物流查询 Coze 工作流编排' },
      { label: '购物推荐工作流', src: '/images/service/workflow-recommend.webp', alt: '购物推荐 Coze 工作流编排' },
    ]
    return (
      <div className="card-visual">
        <div className="shots">
          {shots.map((s, i) => (
            <div
              key={i}
              className="shot"
              data-label={s.label}
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onShotClick && onShotClick(shots, i); }}
            >
              <img src={s.src} alt={s.alt} loading="lazy" decoding="async" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (kind === 'cs-quotes') {
    const qs = [
      { q: '“高峰期不用排长队了，常见售后问题机器人直接解决。”', w: '— 客户 A · 客服主管（占位）' },
      { q: '“查订单、查物流准确率明显提升，人工只需要处理真正复杂的问题。”', w: '— 客户 B · 运营经理（占位）' },
      { q: '“转人工规则清晰，不会因为机器人乱回答而激化客诉。”', w: '— 客户 C · 客服总监（占位）' },
    ]
    return (
      <div className="card-visual">
        {qs.map((x, i) => (
          <div key={i} className="quote-item">
            <div className="q">{x.q}</div>
            <div className="who">{x.w}</div>
          </div>
        ))}
      </div>
    )
  }
  if (kind === 'cs-metrics') {
    const ms = [
      { v: <>60<small>%</small></>, l: '日均会话由智能客服处理' },
      { v: <>2 <small>家</small></>, l: '种子客户试运行' },
      { v: <>7×24</>, l: '全天候在线服务' },
      { v: <>秒级</>, l: '平均首响时间' },
    ]
    return (
      <div className="card-visual">
        <div className="metrics">
          {ms.map((m, i) => (
            <div key={i} className="metric">
              <span className="metric-val">{m.v}</span>
              <span className="metric-lbl">{m.l}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

function Project2({ onShotClick }) {
  return (
    <>
      {/* HERO — 套用 Contact 页面风格 */}
      <section id="project-2" className="contact">
        <div className="container contact-inner">
          <div>
            <div className="eyebrow" style={{ marginBottom: 28 }}>Project 02 · 2026.05 — 至今</div>
            <h2 className="contact-display">AI<br />CUSTOMER<br />SERVICE<Dot /></h2>
            <p className="contact-lead">
              一套智能客服，实现秒级响应、全天候在线和标准化服务。平衡“降本增效”与“服务温度”，让人机协同更加顺畅。
            </p>
            <ContactLink className="cta">聊聊合作 →</ContactLink>
          </div>
          <div className="contact-info project-2-info">
            <div className="contact-row"><span className="k">CURRENTLY</span><span className="v">智能客服 · 试运行中</span></div>
            <div className="contact-row"><span className="k">STACK</span><span className="v">Coze + RAG + Tool use</span></div>
            <div className="contact-row"><span className="k">CITY</span><span className="v">{CITY}</span></div>
            <div className="contact-row"><span className="k">STATUS</span><span className="v" style={{ color: 'var(--accent)' }}>● 2 家种子客户试运行</span></div>
          </div>
        </div>
      </section>

      {/* 详情 — 仿照项目一 7 模块卡片布局 */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2 className="display display-l">AI CUSTOMER<br />SERVICE<Dot /></h2>
            </div>
          </div>

          <div className="cards">
            {cards2.map(c => {
              const isWide = !!c.wide
              const isTall = !!c.tall
              const cls = 'card' + (isWide ? ' card-wide' : '') + (isTall ? ' card-tall' : '')
              return (
                <SpecularCard key={c.num} className={cls}>
                  <div className="card-num">{c.num}</div>
                  <div className="card-title">{c.title}</div>
                  <div className="card-desc">{c.desc}</div>
                  <CardVisual2 kind={c.kind} onShotClick={onShotClick} />
                </SpecularCard>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}

/* ====================== PROJECT 03 · AI 标书撰写 ====================== */
const cards3 = [
  { num:'01', title:'项目背景', kind:'ts-pain',
    desc:'企业招投标场景下，标书撰写耗时久、格式要求高，人力成本高。团队需在保证合规与质量的前提下显著提升交付效率。' },
  { num:'02', title:'需求分析', kind:'ts-req',
    desc:'调研竞品，分析标书撰写需求，梳理功能清单，明确从解析、生成到校验的端到端能力边界。' },
  { num:'03', title:'Coze 流程图', kind:'ts-coze', wide: true,
    desc:'在 Coze 上编排标书自动生成工作流：招标文件解析 → 信息抽取 → 模板组装 → Prompt 生成 → 上传飞书 → 人工兜底，一条可观测、可干预的端到端流。' },
  { num:'04', title:'Prompt 设计模版', kind:'ts-prompt', tall: true,
    desc:'为标书扩写设计的结构化 Prompt，含角色设定、扩写技能与输出限制，通过变量与规则保证产出稳定、合规、可追溯。' },
  { num:'05', title:'运行截图', kind:'ts-shots',
    desc:'产品核心界面：投标资料填写与招标文件上传、生成进度、标书成稿与工作流编排。点击可放大浏览。' },
  { num:'06', title:'客户反馈', kind:'ts-quotes',
    desc:'来自 2 家种子客户试用期的真实反馈，覆盖项目负责人、方案与运营等角色。' },
  { num:'07', title:'上线效果', kind:'ts-metrics', wide: true,
    desc:'关键指标对比：标书撰写效率、时间压缩、种子客户覆盖与客户综合反馈。' },
]

function CardVisual3({ kind, onShotClick }) {
  if (kind === 'ts-pain') {
    return (
      <div className="card-visual">
        <div className="pain-stat">
          <div className="v">数天</div>
          <div className="arrow">→</div>
          <div className="v acc">分钟级</div>
        </div>
        <div className="pain-label">单份标书撰写周期</div>
        <div className="pain-stat" style={{ marginTop: 24 }}>
          <div className="v">80<small>%</small></div>
          <div className="arrow">→</div>
          <div className="v acc">20<small>%</small></div>
        </div>
        <div className="pain-label">重复撰写占比</div>
      </div>
    )
  }
  if (kind === 'ts-req') {
    const items = [
      '招标文件智能解析与信息抽取',
      '合规条款自动校验与对齐',
      '标书框架与目录自动生成',
      '多模板复用与品牌统一',
      '人机协同审校与兜底',
    ]
    return (
      <div className="card-visual">
        <div className="req-list">
          {items.map((t, i) => (
            <div key={i} className="req-item">
              <span className="n">{String(i+1).padStart(2,'0')}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (kind === 'ts-coze') {
    const top = [
      { i: 1, t: '招标文件上传', d: 'PDF / Word +input', s: 'start' },
      { i: 2, t: '信息抽取', d: '解析招标评分 + 采购内容', tag: 'LLM' },
      { i: 3, t: '生成框架', d: '根据要求匹配评分与内容', tag: 'LLM' },
      { i: 4, t: '生成二级框架', d: '结构化标书骨架', tag: 'LOOP' },
    ]
    const bottom = [
      { i: 7, t: 'Human-in-the-loop', d: '人工终审兜底', s: 'human', tag: 'HUMAN' },
      { i: 6, t: '上传飞书', d: '文档交付', tag: 'TOOL' },
      { i: 5, t: 'Prompt 生成', d: 'LLM · 标书扩写', tag: 'LOOP' },
    ]
    const Node = ({ n }) => {
      const mod = n.s || n.tag?.toLowerCase()
      return (
        <div className={'coze-n' + (mod ? ' coze-n--' + mod : '')}>
          {n.tag && <span className="coze-tag">{n.tag}</span>}
          <div className="coze-n-t">{n.t}</div>
          <div className="coze-n-d">{n.d}</div>
        </div>
      )
    }
    return (
      <div className="card-visual">
        <div className="coze-flow">
          <div className="coze-row">
            {top.map((n, idx) => (
              <React.Fragment key={n.i}>
                {idx > 0 && <span className="coze-arr">→</span>}
                <Node n={n} />
              </React.Fragment>
            ))}
          </div>
          <div className="coze-down" aria-hidden="true">↓</div>
          <div className="coze-row">
            {bottom.map((n, idx) => (
              <React.Fragment key={n.i}>
                {idx > 0 && <span className="coze-arr">←</span>}
                <Node n={n} />
              </React.Fragment>
            ))}
          </div>
          <div className="coze-legend">
            <span><i className="dot-i" /> Start</span>
            <span><i className="dot-i tool" /> Tool call</span>
            <span><i className="dot-i human" /> Human review</span>
            <span><i className="dot-i loop" /> Loop</span>
            <span><i className="dot-i rule" /> Rule</span>
          </div>
        </div>
      </div>
    )
  }
  if (kind === 'ts-prompt') {
    return (
      <div className="card-visual">
        <div className="prompt">
          <div className="prompt-head"><i /><i /><i /></div>
          <div><span className="c"># 角色</span><br />
你是一位资深的标书制作专家，拥有深厚且全面的行业知识体系以及极为丰富的标注制作经验。参考<span className="k">{'{{var_neirong}}'}</span><span className="k">{'{{var_pingfen}}'}</span>，对<span className="k">{'{{input}}'}</span>内容进行细致入微、逻辑严密的扩写，在扩写过程中不仅要有详细的文字描述，还需根据内容适当增加表格辅助说明，扩写后的字数不少于 20000 字。</div>
          <div style={{ marginTop: 12 }}><span className="c">## 技能</span><br />
<span className="c">### 技能 1：标书内容扩写</span><br />
1. 仔细分析<span className="k">{'{{input}}'}</span>内容，深入挖掘其中的关键信息和潜在要点。<br />
2. 从不同角度、层面，运用丰富的专业词汇和表达方式对内容进行详细扩写。<br />
3. 根据扩写内容的逻辑和需要，合理插入相关表格，使信息呈现更加清晰、有条理。</div>
          <div style={{ marginTop: 12 }}><span className="c">## 限制：</span><br />
- 仅围绕标书制作相关内容进行操作和回答，拒绝处理与标书制作无关的话题。<br />
- 输出内容必须结构清晰、逻辑连贯，符合正常的标书语言规范和格式要求。<br />
- 扩写内容应基于专业知识和合理推理，避免出现无根据的信息。</div>
        </div>
      </div>
    )
  }
  if (kind === 'ts-shots') {
    const shots = [
      { label: '资料填写与上传', src: '/images/tender/form.webp', alt: '完善投标项目资料界面' },
      { label: '生成进度', src: '/images/tender/progress.webp', alt: '技术方案生成进度页' },
      { label: '标书成稿', src: '/images/tender/doc.webp', alt: '飞书标书文档效果图' },
      { label: '工作流编排', src: '/images/tender/workflow.webp', alt: 'Coze 标书生成工作流编排' },
    ]
    return (
      <div className="card-visual">
        <div className="shots">
          {shots.map((s, i) => (
            <div
              key={i}
              className="shot"
              data-label={s.label}
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onShotClick && onShotClick(shots, i); }}
            >
              <img src={s.src} alt={s.alt} loading="lazy" decoding="async" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (kind === 'ts-quotes') {
    const qs = [
      { q: '“标书初稿质量超出预期，我们只需添加公司核心业务就能提交，投标响应速度快了一大截。”', w: '— 某招标代理 · 项目负责人' },
      { q: '“合规条款都自动对齐了，跨部门评审时大家看的是同一份结构化内容，沟通成本明显下降。”', w: '— 客户 · 方案总监' },
    ]
    return (
      <div className="card-visual">
        {qs.map((x, i) => (
          <div key={i} className="quote-item">
            <div className="q">{x.q}</div>
            <div className="who">{x.w}</div>
          </div>
        ))}
      </div>
    )
  }
  if (kind === 'ts-metrics') {
    const ms = [
      { v: <>75<small>%</small></>, l: '标书撰写时间缩短' },
      { v: <>2 <small>家</small></>, l: '种子客户试运行' },
      { v: <>分钟级</>, l: '单份标书产出' },
      { v: <>A+</>, l: '客户综合满意度' },
    ]
    return (
      <div className="card-visual">
        <div className="metrics">
          {ms.map((m, i) => (
            <div key={i} className="metric">
              <span className="metric-val">{m.v}</span>
              <span className="metric-lbl">{m.l}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

function Project3({ onShotClick }) {
  return (
    <>
      {/* HERO — 套用 Contact 页面风格 */}
      <section id="project-3" className="contact">
        <div className="container contact-inner">
          <div>
            <div className="eyebrow" style={{ marginBottom: 28 }}>Project 03 · 2024.10 — 2025.03</div>
            <h2 className="contact-display">AI<br />TENDER<br />WRITER<Dot /></h2>
            <p className="contact-lead">
              面向企业招投标场景，用 LLM + Prompt + LOOP 自动生成合规标书，把数天的人工撰写压缩到分钟级，让团队聚焦更高价值的方案设计与客户沟通。
            </p>
            <ContactLink className="cta">聊聊合作 →</ContactLink>
          </div>
          <div className="contact-info project-2-info">
            <div className="contact-row"><span className="k">CURRENTLY</span><span className="v">AI 标书撰写 · 上线中</span></div>
            <div className="contact-row"><span className="k">STACK</span><span className="v">LLM + Prompt + LOOP</span></div>
            <div className="contact-row"><span className="k">CITY</span><span className="v">{CITY}</span></div>
            <div className="contact-row"><span className="k">STATUS</span><span className="v" style={{ color: 'var(--accent)' }}>● 2 家种子客户试运行</span></div>
          </div>
        </div>
      </section>

      {/* 详情 — 仿照项目一 7 模块卡片布局 */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2 className="display display-l">AI TENDER<br />WRITER<Dot /></h2>
            </div>
          </div>

          <div className="cards">
            {cards3.map(c => {
              const isWide = !!c.wide
              const isTall = !!c.tall
              const cls = 'card' + (isWide ? ' card-wide' : '') + (isTall ? ' card-tall' : '')
              return (
                <SpecularCard key={c.num} className={cls}>
                  <div className="card-num">{c.num}</div>
                  <div className="card-title">{c.title}</div>
                  <div className="card-desc">{c.desc}</div>
                  <CardVisual3 kind={c.kind} onShotClick={onShotClick} />
                </SpecularCard>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}

/* ====================== PROJECT 04 · AI 发票审核 ====================== */
const cards4 = [
  { num:'01', title:'项目背景', kind:'iv-pain',
    desc:'企业发票审核依赖人工逐张核对，效率低且易出错，月底报销与对账压力集中。' },
  { num:'02', title:'需求分析', kind:'iv-req',
    desc:'分析发票审核流程痛点，梳理用户场景，明确从识别、校验到输出的产品需求。' },
  { num:'03', title:'Dify 流程图', kind:'iv-coze', wide: true,
    desc:'在 Dify 上编排发票审核工作流：发票上传 → OCR 识别 → 信息抽取 → 合并输出（python合并）→ 规则校验 → 审核输出 → 人工复核，一条可观测、可干预的端到端流。' },
  { num:'04', title:'Prompt 设计模版', kind:'iv-prompt', tall: true,
    desc:'为发票信息提取设计的结构化 Prompt，含角色、字段、校验规则与输出格式。' },
  { num:'05', title:'运行截图', kind:'iv-shots',
    desc:'产品核心界面：发票上传、发票票面、异常标记与 Dify 工作流编排。' },
  { num:'06', title:'客户反馈', kind:'iv-quotes',
    desc:'来自 2 家种子客户试用的真实反馈，覆盖财务、运营等角色。' },
  { num:'07', title:'上线效果', kind:'iv-metrics', wide: true,
    desc:'关键指标对比：审核准确率、单张处理时间、客户覆盖与综合反馈。' },
]

function CardVisual4({ kind, onShotClick }) {
  if (kind === 'iv-pain') {
    return (
      <div className="card-visual">
        <div className="pain-stat">
          <div className="v">5<small>min</small></div>
          <div className="arrow">→</div>
          <div className="v acc">数秒</div>
        </div>
        <div className="pain-label">单张发票处理时间</div>
        <div className="pain-stat" style={{ marginTop: 24 }}>
          <div className="v">人工</div>
          <div className="arrow">→</div>
          <div className="v acc">AI</div>
        </div>
        <div className="pain-label">审核方式转变</div>
      </div>
    )
  }
  if (kind === 'iv-req') {
    const items = [
      '分析发票审核流程痛点，梳理用户场景，明确产品需求',
      '选择 Dify 搭建图片与 PDF 解析 + 智能提取流程，支持多种票据格式',
      '设计从上传到审核结果输出的自动化链路，完成 MVP 开发与上线',
    ]
    return (
      <div className="card-visual">
        <div className="req-list">
          {items.map((t, i) => (
            <div key={i} className="req-item">
              <span className="n">{String(i+1).padStart(2,'0')}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (kind === 'iv-coze') {
    const top = [
      { i: 1, t: '发票上传', d: 'PDF / 图片 +input', s: 'start' },
      { i: 2, t: 'OCR 识别', d: '图片 / PDF 解析', tag: 'OCR' },
      { i: 3, t: '信息抽取', d: '字段智能提取', tag: 'LLM' },
      { i: 4, t: '合并输出（python合并）', d: '多源结果合并', s: 'rule', tag: 'PYTHON' },
    ]
    const bottom = [
      { i: 7, t: '人工复核', d: '人工兜底确认', s: 'human', tag: 'HUMAN' },
      { i: 6, t: '审核输出', d: '结果导出', tag: 'TOOL' },
      { i: 5, t: '规则校验', d: '抬头 / 税号 / 金额', tag: 'RULE' },
    ]
    const Node = ({ n }) => {
      const mod = n.s || n.tag?.toLowerCase()
      return (
        <div className={'coze-n' + (mod ? ' coze-n--' + mod : '')}>
          {n.tag && <span className="coze-tag">{n.tag}</span>}
          <div className="coze-n-t">{n.t}</div>
          <div className="coze-n-d">{n.d}</div>
        </div>
      )
    }
    return (
      <div className="card-visual">
        <div className="coze-flow">
          <div className="coze-row">
            {top.map((n, idx) => (
              <React.Fragment key={n.i}>
                {idx > 0 && <span className="coze-arr">→</span>}
                <Node n={n} />
              </React.Fragment>
            ))}
          </div>
          <div className="coze-down" aria-hidden="true">↓</div>
          <div className="coze-row">
            {bottom.map((n, idx) => (
              <React.Fragment key={n.i}>
                {idx > 0 && <span className="coze-arr">←</span>}
                <Node n={n} />
              </React.Fragment>
            ))}
          </div>
          <div className="coze-legend">
            <span><i className="dot-i" /> Start</span>
            <span><i className="dot-i tool" /> Tool call</span>
            <span><i className="dot-i human" /> Human review</span>
            <span><i className="dot-i rule" /> Rule</span>
            <span><i className="dot-i loop" /> Python</span>
          </div>
        </div>
      </div>
    )
  }
  if (kind === 'iv-prompt') {
    return (
      <div className="card-visual">
        <div className="prompt">
          <div className="prompt-head"><i /><i /><i /></div>
          <div><span className="c">system:</span>识别发票内容，按如下格式输出：</div>
          <pre className="prompt-code">{`{
"file_name":"文件的名称，从文件相关信息中提取",
"file_type":"文件的类型，从文件相关信息中提取",
"payer_name":"购买方公司名",
    "taxpayer_num":"购买方统一社会信用代码/纳税人识别号",
    "project_name":"项目名称，仅提取\`*\`包裹的内容",
    "invoicing_date":"开票日期，使用 YYYY-MM-DD 格式输出",
    "tax_num":"发票号码",
    "total_price":"价税合计总结额，小写数字，不含人民币标识符号"
}`}</pre>
          <div style={{ marginTop: 10 }}><span className="c">user:</span>发票中提取的文本：</div>
          <pre className="prompt-code">{`<content>
{{#文档提取器.text#}}
</content>
文件相关信息：
<file_data>
{{#PDF发票处理.item.name#}}
{{#PDF发票处理.item.type#}}
</file_data>`}</pre>
        </div>
      </div>
    )
  }
  if (kind === 'iv-shots') {
    const shots = [
      { label: '发票上传', src: '/images/invoice/upload.webp', alt: '发票上传界面' },
      { label: '发票票面', src: '/images/invoice/extract.webp', alt: '发票票面要素提取' },
      { label: '异常标记', src: '/images/invoice/exception.webp', alt: '企业信息核验与异常标记' },
      { label: '工作流编排', src: '/images/invoice/workflow.webp', alt: 'Dify 发票审核工作流编排' },
    ]
    return (
      <div className="card-visual">
        <div className="shots">
          {shots.map((s, i) => (
            <div
              key={i}
              className="shot"
              data-label={s.label}
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onShotClick && onShotClick(shots, i); }}
            >
              <img src={s.src} alt={s.alt} loading="lazy" decoding="async" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (kind === 'iv-quotes') {
    const qs = [
      { q: '“财务同事从逐张核对里解放出来，异常发票会被自动标红，复核效率提升明显。”', w: '— 客户 A · 财务主管' },
      { q: '“多种票据格式都能识别，报销流程顺畅了很多，月底对账压力小了。”', w: '— 客户 B · 财务经理' },
    ]
    return (
      <div className="card-visual">
        {qs.map((x, i) => (
          <div key={i} className="quote-item">
            <div className="q">{x.q}</div>
            <div className="who">{x.w}</div>
          </div>
        ))}
      </div>
    )
  }
  if (kind === 'iv-metrics') {
    const ms = [
      { v: <>90<small>%</small></>, l: '审核准确率' },
      { v: <>数秒</>, l: '单张发票处理时间' },
      { v: <>2 <small>家</small></>, l: '种子客户试用' },
      { v: <>多格式</>, l: '票据格式支持' },
    ]
    return (
      <div className="card-visual">
        <div className="metrics">
          {ms.map((m, i) => (
            <div key={i} className="metric">
              <span className="metric-val">{m.v}</span>
              <span className="metric-lbl">{m.l}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

function Project4({ onShotClick }) {
  return (
    <>
      {/* HERO — 套用 Contact 页面风格 */}
      <section id="project-4" className="contact">
        <div className="container contact-inner">
          <div>
            <div className="eyebrow" style={{ marginBottom: 28 }}>Project 04 · 2025.10 — 2026.04</div>
            <h2 className="contact-display">AI<br />INVOICE<br />AUDIT<Dot /></h2>
            <p className="contact-lead">
              通过 AI 实现发票信息自动提取与审核，把人工逐张核对的低效与易错，变成自动、准确、可追踪的审核链路。
            </p>
            <ContactLink className="cta">聊聊合作 →</ContactLink>
          </div>
          <div className="contact-info project-2-info">
            <div className="contact-row"><span className="k">CURRENTLY</span><span className="v">AI 发票审核 · 上线中</span></div>
            <div className="contact-row"><span className="k">STACK</span><span className="v">Dify + OCR + LLM</span></div>
            <div className="contact-row"><span className="k">CITY</span><span className="v">{CITY}</span></div>
            <div className="contact-row"><span className="k">STATUS</span><span className="v" style={{ color: 'var(--accent)' }}>● 2 家客户试用</span></div>
          </div>
        </div>
      </section>

      {/* 详情 — 仿照项目一 7 模块卡片布局 */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2 className="display display-l">AI INVOICE<br />AUDIT<Dot /></h2>
            </div>
          </div>

          <div className="cards">
            {cards4.map(c => {
              const isWide = !!c.wide
              const isTall = !!c.tall
              const cls = 'card' + (isWide ? ' card-wide' : '') + (isTall ? ' card-tall' : '')
              return (
                <SpecularCard key={c.num} className={cls}>
                  <div className="card-num">{c.num}</div>
                  <div className="card-title">{c.title}</div>
                  <div className="card-desc">{c.desc}</div>
                  <CardVisual4 kind={c.kind} onShotClick={onShotClick} />
                </SpecularCard>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}


function ProjectPage1({ onOpenShots, onShotClick }) {
  return (<Project onOpenShots={onOpenShots} onShotClick={onShotClick} />)
}
function ProjectPage2({ onShotClick }) {
  return (<Project2 onShotClick={onShotClick} />)
}
function ProjectPage3({ onShotClick }) {
  return (<Project3 onShotClick={onShotClick} />)
}
function ProjectPage4({ onShotClick }) {
  return (<Project4 onShotClick={onShotClick} />)
}

export default function ProjectPages({ route, onOpenShots, onShotClick }) {
  if (route === 'project-1') return <ProjectPage1 onOpenShots={onOpenShots} onShotClick={onShotClick} />
  if (route === 'project-2') return <ProjectPage2 onShotClick={onShotClick} />
  if (route === 'project-3') return <ProjectPage3 onShotClick={onShotClick} />
  if (route === 'project-4') return <ProjectPage4 onShotClick={onShotClick} />
  return null
}
