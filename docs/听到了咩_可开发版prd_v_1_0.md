# 《听到了咩》可开发版 PRD v1.0

更新时间：2026-05-14  
当前状态：V0.6 手机端自测版 / PWA 可安装版推进中  
代码基准：当前 `heard-sheep` 工作区

## 1. 产品概述

### 1.1 产品名称

听到了咩 / heard-sheep

### 1.2 产品定位

一款面向职场个人的 AI 语音任务助手，帮助用户把领导、同事、会议中的口头交代，转化为可执行、可确认、可追踪的任务计划。

### 1.3 核心价值

- 降低口头交代遗漏风险。
- 把模糊表达整理成任务、步骤、缺失信息和确认问题。
- 保留原文依据，方便用户回看和确认。
- 通过历史记录和任务页持续追踪待办状态。

### 1.4 当前版本目标

本版本目标是跑通 Web MVP 闭环，并进入 V0.6 手机端自测版：核心文本、图片、音频能力已真实验证，下一步进入手机真机使用与体验问题回收。

V0.6 同步引入新版小羊状态视觉体系，统一品牌形象与等待、成功、错误、空状态等反馈表达。

```text
录音 / 上传音频 / 粘贴转写稿 / 上传图片
→ 转写确认
→ AI 分析
→ 整理文本 / 任务提取 / 执行方案
→ 任务详情
→ 编辑任务
→ 历史回看
```

## 2. 用户与场景

### 2.1 目标用户

- 经常接收临时口头任务的职场个人。
- 需要整理会议、领导交代、客户需求和汇报反馈的一线执行者。
- 需要快速把语音或聊天内容转成行动计划的人。

### 2.2 典型场景

| 场景 | 用户问题 | 产品处理 |
| --- | --- | --- |
| 领导临时交代 | 内容分散、口头表达不完整 | 录音后转写，AI 提取任务与确认问题 |
| 会议后跟进 | 多个事项混在一起 | 生成任务列表、执行顺序和风险 |
| 客户需求沟通 | 需求边界不清 | 标记缺失信息和建议确认问题 |
| 微信语音/聊天 | 信息来自非会议渠道 | 粘贴转写稿或上传图片后分析 |

## 3. 范围边界

### 3.1 当前已实现

- Next.js App Router Web MVP。
- 移动端优先手机容器。
- 录音、上传音频、粘贴转写稿、上传图片入口。
- 浏览器录音，支持暂停、继续、结束、重点标记。
- 浏览器 Web Speech API 实时识别尝试。
- 服务端 `/api/transcribe` provider 架构，支持 Xiaomi MiMo 音频理解、OpenAI-compatible ASR provider 与 mock fallback。
- `/api/vision/extract-text` provider 架构，支持 Xiaomi MiMo 图片理解，失败时回到手动确认图片文字。
- `/api/analyze` provider 架构，默认使用 DeepSeek V4 Flash，保留 MiMo OpenAI-compatible API 与 mock fallback。
- Zod 校验 AI 输出结构。
- 结果页三 Tab。
- 任务详情与任务编辑。
- 标签系统。
- 历史记录与任务页筛选。
- 我的页设置、导出、隐私说明和多个 MVP 占位交互。
- 本地 JSON 文件存储。

### 3.2 当前不做

- 多用户账号体系。
- 团队协作和权限。
- 云端同步。
- 真实日历联动。
- 支付、会员真实权益。
- 移动 App。

## 4. 信息架构

| 页面 | 路由 | 主要职责 |
| --- | --- | --- |
| 首页 | `/sheep` | 录音主入口、上传/粘贴/图片入口、最近任务 |
| 任务页 | `/sheep/tasks` | 展示任务列表，按状态和优先级筛选 |
| 历史页 | `/sheep/history` | 按时间回看记录，支持搜索 |
| 我的页 | `/sheep/me` | 统计、模型设置、导出、隐私、占位入口 |
| 结果页 | `/sheep/result/[id]` | 展示分析结果三 Tab |
| 任务详情页 | `/sheep/task/[id]` | 查看和编辑单个任务 |

说明：项目默认 `basePath=/sheep`，API 路由也应通过 `/sheep/api/...` 访问。

## 5. 核心功能需求

### 5.1 首页

目标：保持录音为最高优先级入口。

已实现：

- 产品名与副标题。
- 小羊品牌视觉。
- 中央主按钮「开始录音」。
- 辅助入口：上传音频、粘贴转写稿、识别图片。
- 最近任务列表。
- 底部导航：首页、任务、历史、我的。

### 5.2 录音流程

已实现：

- 请求麦克风权限。
- MediaRecorder 录音。
- 录音计时。
- 暂停 / 继续 / 结束。
- 波形动效。
- 录音重点标记。
- 录音少于 5 秒时提示可重新录音或继续处理。
- 浏览器支持 Web Speech API 时显示实时识别文本。
- 结束后进入转写确认；服务端可使用 Xiaomi MiMo 音频理解做真实转写验证，失败时可回退 mock。

### 5.3 上传音频

已实现：

- 支持选择音频文件。
- 支持格式提示：mp3 / wav / m4a / webm。
- 展示文件名和大小。
- 点击「开始转写」进入 `/api/transcribe`。

### 5.4 粘贴转写稿

已实现：

- 多行文本输入。
- 示例文本。
- 清空。
- 空文本、过短、过长校验。
- 直接进入 AI 分析。

### 5.5 图片识别

已实现：

- 支持 PNG / JPG / WebP。
- 支持多图选择，最多 9 张。
- 展示预览与文件名。
- 调用 `/api/vision/extract-text` 自动提取图片文字。
- 自动进入“确认图片文字”页并预填识别结果。
- 用户确认或修改后，继续调用 DeepSeek 生成任务计划。

限制：

- DeepSeek V4 Flash 当前使用文本 Chat Completions，不直接读图；图片理解已拆给 Xiaomi Vision Provider。
- Xiaomi 图片理解失败时，前端会降级到“确认图片文字”流程，用户可粘贴/校对截图文字后继续生成任务。
- mock 模式不会真实 OCR。

### 5.6 转写确认

已实现：

- 展示转写文本。
- 用户可编辑文本。
- 支持重新转写。
- 支持确认并生成任务。

### 5.7 AI 分析

已实现：

- `/api/analyze` 接收 `raw_text`、`source`。
- 默认 provider 为 DeepSeek V4 Flash。
- 当前推荐模型为 `deepseek-v4-flash`。
- 未配置 `DEEPSEEK_API_KEY` 或 provider 失败时可回退 mock。
- 使用 Zod 校验 AI 输出。
- 真实模型输出 JSON 解析失败时会尝试一次修复请求。
- 结果包含 `meta`，用于标记 provider、model、fallback 状态。

### 5.8 结果页

已实现三 Tab：

- 整理文本：核心摘要、关键要求、时间信息、整理后内容、特殊要求、录音标记。
- 任务提取：任务卡片、优先级、截止时间、需确认、原文依据。
- 执行方案：推荐执行顺序、缺失信息、建议确认问题、风险提示。

### 5.9 任务详情与编辑

已实现：

- 展示原始记录信息。
- 展示整理后内容。
- 展示待办事项和执行步骤。
- 展示原文依据、缺失信息、确认问题、风险提示。
- 可编辑标题、截止时间、优先级、描述、步骤、确认问题、完成状态、标签。
- 可切换任务完成状态。

### 5.10 任务页

已实现：

- 展示全部任务。
- 支持全部 / 待处理 / 需确认 / 已完成筛选。
- 支持优先级筛选。
- 点击任务进入详情。

### 5.11 历史页

已实现：

- 按日期分组展示记录。
- 展示标题、任务数、待处理数、创建时间。
- 支持搜索。
- 支持 `filter=recordings` 显示录音记录。

### 5.12 我的页

已实现：

- 小羊头像与用户信息。
- 录音次数、全部任务、已完成统计，可点击跳转。
- 本月录音用量。
- 通知提醒设置（MVP 本地交互）。
- 录音质量设置（MVP 本地交互）。
- AI 模型设置。
- Markdown / JSON 导出。
- 日历接入说明与预约占位。
- 账号与隐私说明、清空本地数据。
- 会员升级、使用帮助、评分、退出登录占位交互。

## 6. AI 输出结构

`/api/analyze` 输出需要满足：

```ts
type AnalyzeResult = {
  title: string
  summary: string
  organized_text: {
    cleaned_text: string
    key_points: string[]
    time_mentions: string[]
    special_requirements: string[]
  }
  tasks: AnalyzeTask[]
  global_confirm_questions: string[]
  warnings: string[]
  meta?: {
    provider: "deepseek" | "mimo" | "mock" | "mock_fallback"
    model?: string
    fallbackUsed: boolean
    error?: string
  }
}
```

每条任务：

```ts
type AnalyzeTask = {
  id: string
  title: string
  description: string
  priority: "high" | "medium" | "low"
  priority_reason: string
  deadline_text: string
  deadline_date: string | null
  deliverable: string
  assignee: string
  dependencies: string[]
  steps: string[]
  missing_info: string[]
  confirm_questions: string[]
  risk: string
  source_evidence: string
  confidence: "high" | "medium" | "low"
  need_confirm: boolean
  status: "todo" | "doing" | "done"
  labels?: string[]
}
```

核心规则：

- 不得凭空编造原文没有的信息。
- 截止时间不明确时，不伪造具体日期。
- 每条任务必须有 `source_evidence`。
- 模糊信息进入 `missing_info` 或 `confirm_questions`。
- 输出必须可直接渲染到结果页和任务详情页。

## 7. 数据模型

当前存储在 `data/records.json`。

```ts
type RecordItem = {
  id: string
  title: string
  source: "recording" | "upload" | "paste" | "image"
  rawText: string
  transcriptText: string
  summary: string
  audioName?: string
  audioDuration?: number
  organizedText: OrganizedText
  globalConfirmQuestions: string[]
  warnings: string[]
  aiMeta?: AnalyzeMeta
  tasks: TaskItem[]
  marks?: Mark[]
  createdAt: string
  updatedAt: string
}
```

```ts
type TaskItem = {
  id: string
  recordId: string
  title: string
  description: string
  priority: "high" | "medium" | "low"
  priorityReason?: string
  deadlineText?: string
  deadlineDate?: string | null
  deliverable?: string
  assignee?: string
  dependencies?: string[]
  sourceEvidence: string
  steps: string[]
  missingInfo: string[]
  confirmQuestions: string[]
  risk?: string
  needConfirm: boolean
  confidence: "high" | "medium" | "low"
  status: "todo" | "doing" | "done"
  labels: string[]
}
```

## 8. 标签系统

当前内置标签：

- 来源类：录音、上传、转写、会议、微信、备忘。
- 场景类：领导交代、汇报反馈、项目推进、客户需求、数据分析、紧急。
- 小羊类：听到咩、想清咩、完成咩、确认咩。

标签可在任务编辑中多选，保存后会展示在任务卡片和任务详情中。

## 9. 异常状态

已实现：

- 麦克风权限失败：提示开启权限或改用粘贴转写稿。
- 录音过短：提示重新录音或继续处理。
- 转写失败：允许重新转写或粘贴文本。
- AI 分析失败：允许重新生成或返回转写确认页。
- 未识别出任务：允许手动添加任务或返回修改文本。
- 上传格式错误：提示支持格式。
- 文本为空 / 过短 / 过长：给出提示。

## 10. 验收标准

### 主流程

```text
首页 → 开始录音 → 结束录音 → 转写中 → 转写确认 → AI 分析中 → 结果页 → 任务详情 → 编辑任务 → 保存 → 历史页回看
```

状态：已实现。

### 上传音频流程

```text
首页 → 上传音频 → 开始转写 → 转写确认 → AI 分析 → 结果页
```

状态：已实现；当前可配置 `ASR_PROVIDER=xiaomi-audio` 使用 Xiaomi MiMo 音频理解做真实转写验证，也保留 OpenAI-compatible ASR provider 与 mock fallback。

### 粘贴转写稿流程

```text
首页 → 粘贴转写稿 → 示例文本 → 确认并生成任务 → 结果页
```

状态：已实现。

### 图片流程

```text
首页 → 识别图片 → 上传图片 → Xiaomi 图片理解 → 确认图片文字 → DeepSeek AI 分析 → 结果页
```

状态：已实现；图片文字由 Xiaomi MiMo 自动提取并预填，识别失败时允许手动粘贴文字继续分析。

### V0.6 手机端 / PWA 验收维度

- 手机端录音可用，权限失败时可清晰降级到文本输入。
- 手机端图片上传可用，图片识别成功后进入确认图片文字页。
- 应用可添加到主屏幕，PWA standalone 模式下基础布局可用。
- PWA 图标、favicon、Apple touch icon 使用新版主品牌小羊。
- 新版小羊状态视觉体系在首页、处理中、错误态、空状态和我的页中保持一致。

## 11. 后续迭代建议

1. 持续评估 Xiaomi 音频理解的真实转写质量，必要时接入专门 ASR 服务。
2. 完善图片 OCR / 多模态识别稳定性，补充更多中文截图样本测试。
3. 增加多轮追问，用于补齐缺失信息。
4. 增加真实日历 / 提醒事项同步。
5. 增加云端存储、账号和多端同步。
6. 增加自动化测试和 GitHub Actions。
## V0.6 手机端自测版补充

当前阶段从 Web MVP 推进为 V0.6 手机端自测 App / PWA 公网部署版：文本、图片、音频能力均已真实验证，项目进入手机端部署与真实使用测试阶段。

新增验收维度：

- 手机端录音链路可用，含权限提示、录音状态、转写确认与失败回退。
- 手机端图片链路可用，含相册选图、拍照上传、Xiaomi 图片理解、文字确认与失败回退。
- PWA 可添加到主屏幕，`start_url=/sheep`，`scope=/sheep/`。
- iPhone / Android standalone 模式下底部导航、安全区、弹层和输入页基本可用。
- 部署到 Vercel 时需明确本地 JSON 文件存储限制：适合个人自测与流程验证，不保证长期持久化。

相关文档：

- `docs/手机自测版部署指南_v0.6.md`
- `docs/手机端真机验收清单_v0.6.md`
