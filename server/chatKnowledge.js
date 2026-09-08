// 客服知识库：内容严格来自「高志智简历2.docx」，不编造、不超出简历范围。
// 匹配逻辑为纯检索式（无后端 LLM），仅回答与「面试 AI 产品经理」相关话题。
// 人设：Ai答疑小蜜，语气活泼热情、带点二次元少女感的真实对话风，
//       有文采、不机械照搬简历，统一用「她」「志智姐姐」指代高志智。
//
// 注意：本文件是「前后端共用」的单一知识源，同时被：
//   - 后端 server/index.js（命中本地兜底答案）
//   - 前端 src/ChatWidget.jsx（后端不可用时离线兜底）
// 因此不要在此引入任何 Node 专属 API 或密钥。

const PHONE = '18061479808'
const EMAIL = '653141250@qq.com'
const CITY = '南京'

// 知识条目
//  kws: 具体关键词（权重 3）
//  soft: 泛化词（权重 1，作为「相关信号」，不足以单独命中）
const KB = [
  {
    id: 'bot-intro',
    kws: ['介绍自己', '介绍你', '你自己', '你是谁', '你叫', '你是', '你的身份', '你是什么', '你是谁呀', '你是谁啊', '你叫什么', '了解你', '认识你', '自我', '你是'],
    soft: ['你', '身份', '名字'],
    answer:
      `嗨呀～我是志智姐姐的 Ai答疑小蜜！我是她的专属面试小助手，专门帮你快速了解她的 AI 产品经历、核心技能和联系方式～有什么想了解的尽管问我哦～`,
  },
  {
    id: 'intro-gao',
    kws: ['高志智', '志智', '志智姐姐', '她是谁', '介绍一下她', '介绍一下志智', '介绍一下高志智', '了解志智', '认识志智', '高志智介绍', '她的介绍', '她是什么', '志智介绍'],
    soft: ['介绍', '背景', '谁', '了解', '认识'],
    answer:
      `嗨～志智姐姐是一位常驻${CITY}的 AI 产品经理哦！她有 10 年多的 B 端 UI / 交互设计积淀，最近 2.5 年又一头扎进了 AI 应用落地。她自己一个人就把「AI 合同审核」「智能客服」「AI 标书撰写」「AI 发票审核」这 4 款产品从 0 到 1 跑通上线，超靠谱的～`,
  },
  {
    id: 'ability',
    kws: ['核心能力', '擅长', '优势', '特质', '竞争力', '能做', '差异化', '独特', '价值', '区别', '补'],
    soft: ['能力', '擅长'],
    answer:
      `志智姐姐最擅长的，就是帮 AI 能力找到真实业务里的落脚点～总结起来有三招：
一是 AI 应用落地，她熟悉 Prompt、RAG、Agent、Workflow，能独立用 Coze / Dify 把工作流串起来并跑通 MVP；
二是技术沟通，她清楚大模型的能力边界，能和研发、算法顺畅对齐；
三是设计思维，10 年多的 B 端设计沉淀让她特别在意产品体验细节。
简单说，她能把「AI 能做什么」翻译成「用户真的用得顺」。`,
  },
  {
    id: 'skills',
    kws: ['技能', '工具', '技术栈', '用什么', '栈', 'coze', 'dify', 'cursor', 'claude', 'cursor', 'figma', 'sketch', 'prompt', 'rag', 'agent', 'workflow', 'vibe', 'photoshop', 'illustrator'],
    soft: ['技能', '工具'],
    answer:
      `她的工具箱可热闹啦～
AI 协作上常用 Claude、Cursor 做需求分析和文档原型；智能体搭建用 Coze、Dify 编排 Workflow，反复打磨 Prompt；原型设计离不开 Figma、Sketch；也会用 Vibe Coding 快速跑通 MVP 并部署上线。
技术上她懂大模型基础边界，能读懂 HTML / CSS / JSON，和研发对齐完全不慌～`,
  },
  {
    id: 'projects',
    kws: ['哪些产品', '做过哪些', '哪些项目', '项目概览', '案例', '落地产品', '0到1', '0→1', '交付了'],
    soft: ['项目', '产品', '做过', '案例'],
    answer:
      `她目前已经从 0 到 1 交付了 4 款 AI 产品，分别是：
· AI 合同审核：把单份合同审核从 45 分钟降至 5 分钟，风险条款识别准确率约 92%，已服务 3 家种子客户；
· 智能客服：7×24 在线，日均处理约 60% 会话，支持 2 家种子客户；
· AI 标书撰写：撰写时间缩短约 75%，已服务 2 家种子客户试用；
· AI 发票审核：准确率约 90%，单张处理从 5 分钟降至数秒，已支持 2 家客户。
想了解哪一款，我展开给你讲呀～`,
  },
  {
    id: 'contract',
    kws: ['合同审核', '合同', '风险条款', '法务', '审核合同'],
    soft: ['合同'],
    answer:
      `AI 合同审核是志智姐姐从 0 到 1 搭起来的产品～
她发现中小商贸公司审核合同特别耗时、还容易漏风险点，就用 Coze 搭了一条「上传 → 解析 → 风险条款提取 → 报告生成」的自动化流程，再用 Cursor 辅助产出 PRD 和原型，最后用 Vibe Coding 跑通 MVP 上线。
效果上，单份合同审核从 45 分钟降至 5 分钟，风险条款识别准确率提升到 92%，已经有 3 家种子客户在试运行啦～`,
  },
  {
    id: 'service',
    kws: ['智能客服', '客服', '会话', '售后', '对话机器人', '服务温度'],
    soft: ['客服'],
    answer:
      `智能客服这个项目，目标是让售后秒级响应、7×24 在线，同时保留「服务温度」。
志智姐姐在 Coze 里做了清晰的边界配置：AI 不知道的不乱编、不承诺知识库外的赔偿、超权限的问题一定转人工；RAG 上把售后政策拆成 Q&A，开了混合检索和重排来提升精度；查订单、查物流这类复杂业务会接真实 API，不让 AI 瞎编。
目前日均能处理约 60% 的会话，已经支持 2 家种子客户～`,
  },
  {
    id: 'tender',
    kws: ['标书', '投标', '招投标', 'tender', '撰写'],
    soft: ['标书'],
    answer:
      `AI 标书撰写面向招投标场景，专门解决标书写得慢、格式要求高的问题。
志智姐姐用 LLM 读取招标文件做信息转换，再设计 Prompt + LOOP 的自动生成方案，让框架和正文能自动产出，团队只需补充核心业务内容。
效率上，撰写时间缩短了约 75%，已经有 2 家种子客户试用过～`,
  },
  {
    id: 'invoice',
    kws: ['发票审核', '发票', 'ocr', '财务审核', '报销'],
    soft: ['发票'],
    answer:
      `AI 发票审核基于 Dify + OCR，自动完成发票信息提取和合规校验。
背景是企业月底报销、对账压力大，人工逐张核对又慢又容易出错。志智姐姐设计了「上传 → OCR → 信息抽取 → 规则校验 → 异常标记 → 人工兜底」的完整链路，准确率约 90%，单张处理从 5 分钟降至数秒，已经支持 2 家客户试用～`,
  },
  {
    id: 'career',
    kws: ['职业', '经历', '工作', '转型', '从设计', '设计转', '之前做', '背景', 'ui', '中国移动', '紫金', '物联网'],
    soft: ['经历', '转型', '职业'],
    answer:
      `她的职业路线像一条温柔的弧线，从设计慢慢走向 AI 产品～
早期她在中国移动、创业团队做 B 端 UI / 交互设计，累计 10 年以上，主导过 AIGC 数字藏品、区块链存证等模块的体验设计；2024 年起正式转向 AI 产品经理，把设计思维带进 AI 产品落地，独立完成 4 款 AI 应用从需求、PRD 到上线的全过程。
这份设计积累，让她比其他 PM 更在意产品的体验细节。`,
  },
  {
    id: 'why',
    kws: ['为什么转', '为什么做', '为什么选', '怎么想到', '动机', '原因'],
    soft: ['为什么', '动机'],
    answer:
      `她会转向 AI 产品，是因为发现很多 AI 能力虽然很强，但落到真实业务里，体验和产品化常常差点意思。
她的差异化在于：既有 10 年多的 B 端设计经验，懂得业务流程和体验细节，又能自己用 Coze / Dify / Vibe Coding 把想法快速做成可验证的 MVP。
用她自己的话说，就是能把「AI 的可能性」翻译成「用户真的用得顺的产品」～`,
  },
  {
    id: 'method',
    kws: ['方法', '流程', '怎么落地', '如何落地', '调研', 'prd', '原型', '步骤', '交付', '闭环', '方法论'],
    soft: ['方法', '流程', '落地'],
    answer:
      `她落地一款 AI 产品，通常会走这样几步：
先深入业务一线做需求调研，把真实痛点摸清楚；
再输出 PRD 和业务流程图，明确功能边界与验收标准；
接着用 Coze / Dify 编排 Workflow，反复打磨 Prompt；
然后用 Vibe Coding 快速跑通 MVP 并部署上线；
最后收集上线反馈，持续优化 Prompt 和知识库。
整个过程是一个完整的闭环交付～`,
  },
  {
    id: 'llm',
    kws: ['大模型', 'llm', 'rag', 'agent', '理解', '原理', '边界', '技术理解', '怎么看模型'],
    soft: ['大模型', '模型'],
    answer:
      `在她眼里，大模型是能力的底座，但真正落地要靠工程化包装。
她会用 RAG 把企业私有知识接进来，用 Agent / Workflow 编排多步任务，用结构化 Prompt 约束输出。她也特别注意边界：不确定的事不让 AI 乱承诺，复杂或越权的场景及时转人工。
技术细节上她和算法、研发密切配合，重点放在「怎么用对场景」～`,
  },
  {
    id: 'contact',
    kws: ['联系', '电话', '微信', '邮箱', 'email', '怎么找', '方式', '加你', '沟通方式'],
    soft: ['联系', '电话', '微信', '邮箱'],
    answer:
      `想继续聊的话，随时找她呀～
可以直接打电话 ${PHONE}，或者发邮件到 ${EMAIL}，她常驻${CITY}。如果方便，也很欢迎当面聊聊，交流起来更顺畅哦～`,
  },
  {
    id: 'intent',
    kws: ['求职', '意向', '在职', '状态', '城市', '南京', '全职', '外包', '顾问', '机会', '招聘', '看工作'],
    soft: ['求职', '意向', '机会'],
    answer:
      `她目前常驻${CITY}，正在积极看 AI 产品经理相关的全职、外包或技术顾问机会。
如果你有合适的岗位或合作，欢迎直接联系她：电话 ${PHONE}、邮箱 ${EMAIL}，随时在线等消息～`,
  },
  {
    id: 'education',
    kws: ['学历', '学校', '教育', '毕业', '专业', '北师大', '北京师范大学', '钟山', '大专', '本科', '专业背景', '读书'],
    soft: ['学历', '学校', '教育'],
    answer:
      `她的教育背景是这样的：
本科（非全日制）就读于北京师范大学汉语言文学专业（2014–2016）；
大专（全日制）就读于南京钟山学院计算机应用专业（2006–2009）。
相比学历，她 10 年多的 B 端设计和 AI 产品实战经验更能说明问题哦～`,
  },
  {
    id: 'clients',
    kws: ['客户', '几家', '多少家', '交付数量', '上线数量', '服务过'],
    soft: ['客户'],
    answer:
      `截至目前，她独立交付的 AI 产品已经服务了约 8 家客户，覆盖合同审核、智能客服、标书撰写、发票审核这些场景，大多以种子客户试运行的方式落地，并持续迭代优化中～`,
  },
]

// 核心主题词：用于判断问题是否与「面试 AI 产品经理 / 高志智本人」相关
const TOPIC = ['你', '高志智', 'ai', '产品', '项目', '经历', '工作', '技能', '简历', '合作', '联系', '怎么', '如何', '什么', '哪', '做', '产品', '经理', '面试', 'pm', '经验', '能力']

const GREET = ['你好', '您好', '在吗', '在么', 'hi', 'hello', '嗨', '哈喽', '早上好', '下午好', '晚上好']
const THANKS = ['谢谢', '感谢', 'thx', '多谢', '辛苦', '谢啦']
const BYE = ['再见', '拜拜', '拜', '下次', '告辞', '88']

// 三类「对话管理」语义：追问 / 结束确认 / 不满或质疑
const FOLLOWUP_KW = [
  '还有吗', '还有呢', '还有啥', '还有其它', '还有别的', '继续', '接着说', '继续说', '然后呢', '之后呢',
  '讲详细', '详细说', '具体点', '再具体', '展开', '再讲讲', '多说点', '多说几句', '展开说', '举例', '举个例子',
  '深入', '再深入', '还有要', '还有什么', '还有么', '再聊点', '再聊',
]
const ENDING_KW = [
  '没了', '没有了', '没别的', '结束', '完了', '就这样', '先这样', '暂时没了', '可以了', '够了', 'okk', 'ok了',
  '好了', '到此为止', '先到此', '没有更多', '不问了', '先不问',
]
const FRUSTRATED_KW = [
  '太敷衍', '糊弄', '没诚意', '太水', '水货', '不过如此', '没意思', '不够', '不够看', '缩水', '就这', '差劲',
]

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[\s,，。.、！!？?；;：:""''「」()（）\[\]【】<>《》]/g, '')
}

function hasAny(text, arr) {
  return arr.some((w) => text.includes(w))
}

function matchKB(text) {
  let best = null
  let bestScore = 0
  for (const item of KB) {
    let score = 0
    for (const k of item.kws) if (text.includes(k.toLowerCase())) score += 3
    for (const k of item.soft) if (text.includes(k.toLowerCase())) score += 1
    if (score > bestScore) {
      bestScore = score
      best = item
    }
  }
  return { best, bestScore }
}

// 判断是否为追问（注意不要把「这就是」等误命中为「就这」）
function isFollowup(text) {
  if (hasAny(text, FOLLOWUP_KW)) return true
  // 口语化变体：「还有？」去掉标点后为「还有」
  if (text.endsWith('还有') && text.length <= 6) return true
  return false
}

function isEnding(text) {
  if (hasAny(text, ENDING_KW)) return true
  if (text.endsWith('没了') && text.length <= 8) return true
  return false
}

function isFrustrated(text) {
  if (hasAny(text, FRUSTRATED_KW)) return true
  // 「就这」单独出现才是质疑；「这就是...」不算
  const idx = text.indexOf('就这')
  if (idx !== -1) {
    const nextChar = text.slice(idx + 2, idx + 3)
    if (nextChar !== '是') return true
  }
  return false
}

// 不同意图对应不同委婉话术，绝对禁止统一回复
function getFollowupReply() {
  const replies = [
    `当然有呀～志智姐姐的经历和项目还有好多亮点可以聊呢！比如 4 款 AI 产品的落地细节、她的设计转 AI 路线、工具栈或者联系方式，你想先听哪个？😊`,
    `有呢～除了刚才聊的，你还可以问她做过的 AI 合同审核、智能客服、标书撰写、发票审核项目，或者她是怎么从设计转向 AI 产品的，挑你感兴趣的继续聊呀～`,
    `当然有～我这边整理了她的项目、技能、职业经历和联系方式，你想继续深挖哪一块？我尽量说具体点～`,
  ]
  return replies[Math.floor(Math.random() * replies.length)]
}

function getEndingReply() {
  const replies = [
    `嗯～关于这个问题就这些啦。如果还有别的想了解的，随时打开右上角的小蜜问我哦～也欢迎直接电话联系志智姐姐：${PHONE}，当面沟通会更顺畅哒～`,
    `好哒～那就先聊到这儿。后续想继续了解或合作的话，可以直接打电话 ${PHONE} 找志智姐姐，她常驻${CITY}～`,
    `好呀，先到此为止～如果想起什么问题，随时回来找我，或者直接拨打 ${PHONE} 和志智姐姐当面聊也可以哦～`,
  ]
  return replies[Math.floor(Math.random() * replies.length)]
}

function getFrustratedReply() {
  const replies = [
    `抱歉让你有这种感觉呀～我可能没完全 get 到你的意思，换个说法再问我一次好不好？也可以直接打电话 ${PHONE} 找志智姐姐本人聊，她说得更详细哦～`,
    `哎呀，是我讲得不够到位嘛～你别客气，告诉我你想重点了解什么（项目、技能、经历都可以），我重新整理一下；或者直接联系志智姐姐：${PHONE}。`,
    `不好意思让你觉得太单薄啦～我掌握的主要是简历里的公开信息，可能没覆盖到你想问的点。建议你直接打电话 ${PHONE} 和志智姐姐当面沟通，效率更高哦～`,
  ]
  return replies[Math.floor(Math.random() * replies.length)]
}

// 默认 fallback：真正答不上来 / 无关话题，但仍有 3 套话术轮换，避免机械感
function getDefaultFallback() {
  const replies = [
    `这个问题我暂时答不上来呢，志智姐姐的简历里没有写太细～关于面试 AI 产品经理相关的问题，欢迎直接打电话 ${PHONE} 和她当面聊聊哦～`,
    `哎呀，这块志智姐姐的简历里没展开写，我怕说多了一不小心编出来～如果是面试相关的问题，建议直接打电话 ${PHONE} 找她本人聊，更靠谱哦～`,
    `这个问题超出了我目前掌握的简历信息呢，不敢乱答～想了解 AI 产品经理面试或志智姐姐本人的话，可以直接拨打 ${PHONE} 当面沟通呀～`,
  ]
  return replies[Math.floor(Math.random() * replies.length)]
}

// 返回客服回复文本
export function getReply(raw) {
  const text = normalize(raw)
  if (!text) return '可以问我关于志智姐姐的 AI 产品经历、技能或联系方式哦～'

  // 1. 对话管理意图：追问 / 结束 / 不满 —— 优先处理，不走统一拒答
  if (isFollowup(text)) return getFollowupReply()
  if (isEnding(text)) return getEndingReply()
  if (isFrustrated(text)) return getFrustratedReply()

  // 2. 社交寒暄
  if (hasAny(text, GREET)) {
    return '嗨呀～我是志智姐姐的 Ai答疑小蜜！可以带你快速了解她的 AI 产品经历、技能和联系方式～想先聊哪方面呀？'
  }
  if (hasAny(text, THANKS)) {
    return '嘿嘿，能帮到你就好呀～还有其他想了解的，随时问我哦～'
  }
  if (hasAny(text, BYE)) {
    return `好呀，那先聊到这儿～如果后续想进一步了解或合作，随时打电话 ${PHONE} 找志智姐姐，当面沟通更顺畅哦～`
  }

  // 3. 知识库匹配
  const { best, bestScore } = matchKB(text)
  if (best && bestScore >= 3) {
    return best.answer
  }

  // 4. 与主题相关但没有具体条目 / 明显无关 → 都走分类 fallback，避免同一句话
  const topicHit = hasAny(text, TOPIC)
  if (topicHit) {
    return getDefaultFallback()
  }

  return getDefaultFallback()
}

// 暴露给后端：判断本次是否命中了本地知识库里的具体条目（用于决定是否直接走本地回复）
export function localHit(raw) {
  const text = normalize(raw)
  if (!text) return false
  if (isFollowup(text) || isEnding(text) || isFrustrated(text)) return false
  if (hasAny(text, GREET) || hasAny(text, THANKS) || hasAny(text, BYE)) return false
  const { bestScore } = matchKB(text)
  return bestScore >= 3
}

// 快捷问题（点击即走 getReply）
export const QUICK_QUESTIONS = [
  '简单介绍下志智',
  '志智做过哪些 AI 产品？',
  'AI 合同审核项目讲讲？',
  '志智的技能 / 工具栈？',
  '怎么联系志智？',
]
