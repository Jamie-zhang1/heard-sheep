# 听到了咩 / heard-sheep

> Current AI default: DeepSeek V4. Use `AI_PROVIDER=deepseek`,
> `DEEPSEEK_BASE_URL=https://api.deepseek.com`, and
> `DEEPSEEK_MODEL=deepseek-v4-flash`. For higher quality, switch to
> `deepseek-v4-pro`. See [DeepSeek V4 Provider](docs/deepseek-v4-provider.md).

以录音为主入口的 AI 语音任务助手。它面向职场个人，帮助用户把领导、同事、会议中的口头交代，转化为可执行、可确认、可追踪的任务计划。

当前仓库是一个可运行的 Next.js Web MVP，主链路已经打通：

```text
录音 / 上传音频 / 粘贴转写稿 / 上传图片
→ 转写确认
→ AI 分析
→ 整理文本 / 候选任务 / 执行方案
→ 选择、编辑并确认加入任务清单
→ 任务详情
→ 编辑任务
→ 历史回看
```

## 当前状态

- UI：移动端优先，375px 手机容器，小羊品牌视觉，奶油紫 + 黑白轻工具风。
- 转写：浏览器端优先尝试 Web Speech API；服务端 `/api/transcribe` 已支持 Xiaomi MiMo 音频理解、OpenAI-compatible ASR provider 与 mock fallback。
- AI：`/api/analyze` 默认支持 DeepSeek V4 OpenAI-compatible Chat Completions；未配置密钥或调用失败时可回退到 mock AI，MiMo Provider 仍作为兼容选项保留。
- 图片：`/api/vision/extract-text` 已支持 Xiaomi MiMo 图片理解，上传图片后会自动提取文字并预填“确认图片文字”页；失败时仍可手动粘贴。
- 存储：本地 JSON 文件 `data/records.json`，适合 MVP 演示和本地开发。
- 部署路径：默认启用 `basePath=/sheep`，本地访问地址为 `/sheep`。

## 功能清单

### 输入入口

- 首页主入口：开始录音
- 辅助入口：上传音频、粘贴转写稿、上传图片
- 录音能力：麦克风授权、计时、暂停/继续、结束、录音重点标记
- 上传音频：支持 mp3 / wav / m4a / webm
- 粘贴转写稿：示例文本、清空、空文本/过短/过长校验
- 图片识别：支持多图上传；先用 Xiaomi MiMo 提取图片文字，再进入确认页，确认后继续交给 DeepSeek 生成任务计划

### 分析与任务

- 转写中、转写确认、AI 分析中状态
- 结果页三 Tab：整理文本、候选任务、执行方案
- AI 生成内容默认作为候选任务保存在分析结果中，用户可编辑、多选、全选、批量加入或单条加入任务清单
- 任务详情：原文依据、缺失信息、建议确认问题、风险提示
- 任务编辑：标题、截止时间、优先级、描述、步骤、确认问题、状态、标签
- 任务页：只展示已加入任务，支持全部 / 待处理 / 需确认 / 已完成筛选，优先级筛选
- 历史页：按日期分组，支持搜索，支持录音记录筛选
- 我的页：统计跳转、通知提醒、录音质量、模型设置、导出数据、日历占位、隐私说明、会员/帮助/评分/退出占位交互

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Zod
- JSON 文件本地存储
- API Routes

## 快速开始

```bash
npm install
cp .env.example .env.local
npm run dev
```

访问：

```text
http://127.0.0.1:3000/sheep
```

生产预览：

```bash
npm run build
npm run start
```

## 环境变量

`.env.local` 不要提交到 Git。

```env
NEXT_PUBLIC_BASE_PATH=/sheep

AI_PROVIDER=deepseek
AI_ALLOW_MOCK_FALLBACK=true

DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_TIMEOUT_MS=60000

MIMO_API_KEY=
MIMO_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1
MIMO_MODEL=MiMo-V2.5-Pro
MIMO_TIMEOUT_MS=60000

XIAOMI_API_KEY=
XIAOMI_BASE_URL=https://api.xiaomimimo.com/v1
XIAOMI_TIMEOUT_MS=60000

VISION_PROVIDER=xiaomi-image
VISION_ALLOW_TEXT_FALLBACK=true
XIAOMI_IMAGE_MODEL=mimo-v2.5

ASR_PROVIDER=xiaomi-audio
ASR_ALLOW_MOCK_FALLBACK=true
XIAOMI_AUDIO_MODEL=mimo-v2.5
XIAOMI_AUDIO_INPUT_MODE=input_audio

ASR_API_KEY=
ASR_BASE_URL=https://api.openai.com/v1
ASR_MODEL=whisper-1
ASR_LANGUAGE=zh
ASR_TIMEOUT_MS=60000
```

说明：

- `DEEPSEEK_API_KEY` 只在服务端读取，不要使用 `NEXT_PUBLIC_` 前缀。
- DeepSeek 当前按 OpenAI 兼容协议接入：`https://api.deepseek.com`。
- 默认模型推荐 `deepseek-v4-flash`，成本更低且支持 JSON Output；复杂高质量分析可改为 `deepseek-v4-pro`。
- 未配置 `DEEPSEEK_API_KEY` 时，`/api/analyze` 自动使用 mock AI。
- MiMo Provider 仍保留；设置 `AI_PROVIDER=mimo` 后使用 `MIMO_*` 变量。
- `VISION_PROVIDER=xiaomi-image` 会调用 Xiaomi Chat Completions 多模态接口，使用 Base64 图片提取文字。
- `ASR_PROVIDER=xiaomi-audio` 会调用 Xiaomi Chat Completions 多模态接口，使用 Base64 音频做转写验证。
- `ASR_PROVIDER=openai-compatible` / `openai` / `whisper` 会调用 `${ASR_BASE_URL}/audio/transcriptions`，该能力仍保留。
- 浏览器支持 Web Speech API 时，录音过程中会优先尝试浏览器实时识别；没有识别结果时走服务端 mock 转写。

更多配置见 [docs/ai-asr-provider-setup.md](docs/ai-asr-provider-setup.md)。

## 路由

默认 basePath 为 `/sheep`：

| 路由 | 说明 |
| --- | --- |
| `/sheep` | 首页 |
| `/sheep/tasks` | 任务页 |
| `/sheep/history` | 历史页 |
| `/sheep/me` | 我的页 |
| `/sheep/result/[id]` | 分析结果页 |
| `/sheep/task/[id]` | 任务详情页 |

API 路由同样挂在 basePath 下，例如：

- `/sheep/api/transcribe`
- `/sheep/api/vision/extract-text`
- `/sheep/api/analyze`
- `/sheep/api/records`
- `/sheep/api/tasks`

## 数据存储

MVP 使用本地 JSON 文件：

```text
data/records.json
```

`data/` 已在 `.gitignore` 中忽略。清空数据可在「我的 → 账号与隐私」中操作。

## 多模态真实样本评测

项目提供 `npm run eval:multimodal` 脚本，可基于 manifest 批量测试：

- Xiaomi 图片理解 Provider
- Xiaomi 音频理解 Provider

默认清单在 `eval/multimodal/manifest.example.json`。真实样本放在 `eval/multimodal/samples/`，该目录默认忽略真实素材文件，避免隐私数据被提交。评测结果输出到 `reports/multimodal-eval/`，`reports/` 同样不会提交。

```bash
npm run eval:multimodal
```

评测方案和记录模板：

- [多模态真实样本评测方案 v0.5](docs/多模态真实样本评测方案_v0.5.md)
- [多模态评测记录模板](docs/多模态评测记录模板.md)

## 文档

- [PRD：听到了咩可开发版](docs/听到了咩_可开发版prd_v_1_0.md)
- [AI / ASR Provider 接入说明](docs/ai-asr-provider-setup.md)
- [多模态真实样本评测方案 v0.5](docs/多模态真实样本评测方案_v0.5.md)
- [多模态评测记录模板](docs/多模态评测记录模板.md)
- [功能检测报告](docs/功能检测报告_2026-05-13.md)

## 当前限制

- Xiaomi 音频理解当前用于真实转写能力验证；不同音频格式和噪声环境下的质量仍需继续评估。
- 服务端 ASR 仍保留 OpenAI-compatible provider；需要配置真实 `ASR_API_KEY`、`ASR_BASE_URL` 和 `ASR_MODEL` 才会调用对应供应商。
- 日历联动、会员、评分、退出登录等仍是 MVP 占位交互。
- 图片识别已拆分为独立 Xiaomi Vision Provider；如果 Xiaomi 调用失败，会回到手动确认图片文字的 fallback。
- 当前是单用户本地 MVP，不包含账号体系、团队协作、云端同步或权限系统。

## 常用命令

```bash
npm run dev
npm run typecheck
npm run build
npm run start
```

## 品牌视觉

项目使用原创小羊 mascot 作为品牌识别，并在 v0.6 建立了等待、成功、错误、空状态、鼓励等状态的统一视觉资产映射。页面内的小羊图片应优先通过 `SheepVisual` 和 `lib/sheep-assets.ts` 使用，避免直接硬编码素材路径。

参考：[小羊视觉资产使用说明 v0.6](docs/小羊视觉资产使用说明_v0.6.md)
## 手机端自测版 / PWA

项目已进入 V0.6 手机端自测阶段，可部署为公网 HTTPS 下的可安装 PWA。默认访问路径仍为 `/sheep`，根路径 `/` 会重定向到 `/sheep`。

已补齐：

- Manifest：应用名、描述、主题色、`start_url=/sheep`、`scope=/sheep/`。
- PWA 图标：新版小羊 favicon、Apple touch icon、192/512/maskable icons。
- Service Worker：静态资源最小缓存，`/sheep/api/*` 不缓存。
- 安装入口：首页 / 我的页提供“安装到手机”引导。
- 手机适配：底部安全区、弹层安全区、输入框键盘遮挡、触控目标、录音 MIME 兼容。

部署与真机测试请参考：

- [手机自测版部署指南 v0.6](docs/手机自测版部署指南_v0.6.md)
- [自有服务器部署指南 v0.6](docs/自有服务器部署指南_v0.6.md)
- [手机端真机验收清单 v0.6](docs/手机端真机验收清单_v0.6.md)

注意：当前 Vercel 部署适合个人自测与流程验证；项目仍使用 `data/records.json` 本地 JSON 文件存储，在 Serverless 生产环境中不保证长期持久化。

如果使用自有服务器部署，优先参考 Docker Compose 或 PM2 + Nginx 方案。自有服务器可通过挂载 `data/` 目录保留 MVP JSON 数据，但仍建议定期备份并在长期使用前迁移到正式数据库。
