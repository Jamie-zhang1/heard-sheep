# 听到了咩 AI / ASR Provider 接入说明

更新时间：2026-05-14  
适用代码：当前 `heard-sheep` Next.js MVP

## 1. 当前状态

- `/api/analyze` 已经 provider 化。
- 当前首选真实 LLM Provider：DeepSeek V4 OpenAI-compatible Chat Completions。
- 未配置 `DEEPSEEK_API_KEY` 或真实调用失败时，可自动回退到 mock AI。
- AI 输出会经过 JSON 解析和 Zod schema 校验，不会无校验直接返回给页面。
- `/api/transcribe` 已经 provider 化。
- 服务端 ASR 已支持 Xiaomi MiMo 音频理解 provider 与 OpenAI-compatible `/audio/transcriptions` provider。
- 默认建议 `ASR_PROVIDER=xiaomi-audio` 用于真实音频转写验证；未配置 key 或真实 provider 失败时可回退 mock。
- 新增 `/api/vision/extract-text`，支持 Xiaomi MiMo 图片理解。图片上传后先自动提取文字，再进入“确认图片文字”页。
- 浏览器录音过程中会优先尝试 Web Speech API 实时识别；没有可用识别结果时走服务端 `/api/transcribe` mock fallback。
- 当前项目默认 `basePath=/sheep`，客户端 API 请求应访问 `/sheep/api/...`。

## 2. 环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

推荐开发配置：

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

- `DEEPSEEK_API_KEY` 不要写入 `NEXT_PUBLIC_` 变量。
- `DEEPSEEK_API_KEY` 只在服务端 API Route / Provider 中读取。
- DeepSeek V4 当前使用 OpenAI 兼容协议地址：`https://api.deepseek.com`。
- 默认模型推荐 `deepseek-v4-flash`，成本更低且支持 JSON Output；复杂高质量分析可改为 `deepseek-v4-pro`。
- MiMo Provider 仍保留为兼容选项，设置 `AI_PROVIDER=mimo` 后可使用 `MIMO_*` 变量。
- `XIAOMI_API_KEY` 用于 Xiaomi 图片理解与音频理解，只在服务端读取。
- `XIAOMI_BASE_URL` 标准默认值为 `https://api.xiaomimimo.com/v1`；如果你使用 Token Plan key，可在 `.env.local` 改为 `https://token-plan-cn.xiaomimimo.com/v1`。
- `VISION_PROVIDER=xiaomi-image` 使用 Chat Completions 多模态消息传入 Base64 图片。
- `ASR_PROVIDER=xiaomi-audio` 使用 Chat Completions 多模态消息传入 Base64 音频。
- `.env.local` 已被 `.gitignore` 忽略，不应提交。
- `NEXT_PUBLIC_BASE_PATH` 是公开变量，只用于 Next.js basePath 和客户端 API 路径拼接，不包含敏感信息。

## 3. LLM Provider

相关文件：

```text
lib/ai/
├─ provider.ts
├─ deepseek-provider.ts
├─ mimo-provider.ts
├─ mock-provider.ts
├─ prompts.ts
└─ schema.ts
```

执行逻辑：

```text
前端提交 raw_text / source / images
→ /api/analyze
→ lib/ai/provider.ts 选择 provider
→ DeepSeek / MiMo provider 调用 /chat/completions
→ 提取 JSON
→ Zod schema 校验
→ 成功返回结构化 AnalyzeResult
```

如果真实调用失败：

```text
真实 Provider 请求失败 / JSON 解析失败 / Schema 校验失败
→ 尝试一次 JSON 修复请求
→ 仍失败
→ 如果 AI_ALLOW_MOCK_FALLBACK=true，返回 mock_fallback
→ 如果 AI_ALLOW_MOCK_FALLBACK=false，返回结构化错误
```

## 4. `/api/analyze` 输入输出

请求：

```json
{
  "raw_text": "用户确认后的转写文本",
  "source": "recording",
  "images": ["data:image/png;base64,..."]
}
```

`source` 可选值：

- `recording`
- `upload`
- `paste`
- `image`

响应核心结构：

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

每条任务必须包含 `source_evidence`，并且模糊信息必须进入 `missing_info` 或 `confirm_questions`。

## 5. 如何判断真实 AI 是否生效

查看响应中的：

```ts
result.meta.provider
result.meta.fallbackUsed
result.meta.model
```

可能值：

- `deepseek`：真实 DeepSeek V4 调用成功。
- `mimo`：真实 MiMo 调用成功。
- `mock`：直接使用 mock，通常因为未配置真实 Provider API Key 或 `AI_PROVIDER=mock`。
- `mock_fallback`：尝试真实 Provider 失败后自动回退 mock。

服务端日志会输出：

- `[AI] Provider selection`
- `[AI] Calling DeepSeek provider`
- `[AI] DeepSeek provider succeeded`
- `[AI] DeepSeek provider failed`
- `[AI] Falling back to mock provider`

开发环境下，结果页会在 mock 或 fallback 时显示轻量调试标识。

## 6. Vision Provider

相关文件：

```text
lib/vision/
├─ provider.ts
├─ xiaomi-image-provider.ts
├─ mock-provider.ts
├─ index.ts
└─ prompts.ts
```

执行逻辑：

```text
上传图片
→ /api/vision/extract-text
→ File / Blob 在前端转为 data URL
→ Provider 提取 Base64 与 MIME
→ Xiaomi Chat Completions 多模态请求
→ 返回 extractedText
→ 前端预填“确认图片文字”
→ 用户确认后仍走 DeepSeek /api/analyze
```

请求：

```json
{
  "imageBase64": "data:image/png;base64,...",
  "mimeType": "image/png",
  "filename": "screenshot.png"
}
```

响应：

```ts
type VisionExtractionResult = {
  extractedText: string
  summary?: string
  meta: {
    provider: "xiaomi-image" | "mock" | "fallback"
    model?: string
    fallbackUsed: boolean
    error?: string
  }
}
```

Prompt 目标是“文字与任务相关信息提取”，不是泛泛图片描述。识别失败时，如果：

```env
VISION_ALLOW_TEXT_FALLBACK=true
```

页面会进入手动确认文字流程，用户仍可粘贴/补充图片中的文字继续分析。

## 7. ASR Provider

相关文件：

```text
lib/asr/
├─ provider.ts
├─ mock-provider.ts
├─ xiaomi-audio-provider.ts
├─ openai-compatible-provider.ts
├─ prompts.ts
├─ browser-provider.ts
├─ client.ts
├─ server.ts
└─ index.ts
```

当前实现：

- 浏览器端：`browser-provider.ts` 封装 Web Speech API，录音中可显示实时识别文本。
- 服务端：`/api/transcribe` 通过 `lib/asr/server.ts` 调用 provider。
- 客户端：`HomeClient` 通过 `lib/asr/client.ts` 引入 Web Speech API 工具，避免把 server-only provider 打进浏览器 bundle。
- 服务端可配置 Xiaomi 音频理解 provider、OpenAI-compatible provider 或 mock provider。
- `ASR_PROVIDER=browser` 不会让服务端直接使用浏览器 provider，服务端会提示并使用 mock。
- `ASR_PROVIDER=xiaomi-audio` 会把音频 File / Blob 转成 Base64，通过 Xiaomi Chat Completions 多模态消息请求转写文本。
- `ASR_PROVIDER=openai-compatible`、`openai` 或 `whisper` 会调用 `${ASR_BASE_URL}/audio/transcriptions`。

请求：

```text
POST /sheep/api/transcribe
Content-Type: multipart/form-data

audio: File
source: recording | upload
duration?: number
```

响应：

```ts
type TranscribeResult = {
  text: string
  duration?: number
  source: "recording" | "upload"
  provider: "openai-compatible" | "mock" | "mock_fallback" | string
  model?: string
  fallbackUsed?: boolean
  error?: string
}
```

### 7.1 配置 Xiaomi 音频理解

```env
XIAOMI_API_KEY=你的 Xiaomi Key
XIAOMI_BASE_URL=https://api.xiaomimimo.com/v1
XIAOMI_AUDIO_MODEL=mimo-v2.5
XIAOMI_AUDIO_INPUT_MODE=input_audio

ASR_PROVIDER=xiaomi-audio
ASR_ALLOW_MOCK_FALLBACK=true
```

该 Provider 当前用于真实转写能力验证。返回成功时：

```json
{
  "provider": "xiaomi-audio",
  "model": "mimo-v2.5",
  "fallbackUsed": false
}
```

如果真实调用失败且允许 fallback，则返回 mock 文本，并在 `meta.fallbackUsed=true` 中显式标记。

### 7.2 配置 OpenAI-compatible ASR

```env
ASR_PROVIDER=openai-compatible
ASR_ALLOW_MOCK_FALLBACK=true
ASR_API_KEY=你的 ASR API Key
ASR_BASE_URL=https://api.openai.com/v1
ASR_MODEL=whisper-1
ASR_LANGUAGE=zh
ASR_TIMEOUT_MS=60000
```

只要供应商兼容 OpenAI Audio Transcriptions API，就可以复用该 provider。

## 8. 本地验证

```bash
npm run typecheck
npm run build
npm run start
```

页面：

```text
http://127.0.0.1:3000/sheep
```

API：

```text
POST http://127.0.0.1:3000/sheep/api/analyze
POST http://127.0.0.1:3000/sheep/api/transcribe
POST http://127.0.0.1:3000/sheep/api/vision/extract-text
```

## 9. 后续 ASR 扩展建议

如果供应商不兼容 OpenAI Audio Transcriptions API，可新增 provider：

```text
lib/asr/your-provider.ts
```

实现：

```ts
type TranscribeInput = {
  file?: File | Buffer
  fileName?: string
  source: "recording" | "upload"
  duration?: number
}

type TranscribeResult = {
  text: string
  duration?: number
  source: "recording" | "upload"
  provider: string
  fallbackUsed?: boolean
}
```

然后在 `lib/asr/server.ts` 中根据 `ASR_PROVIDER` 选择即可，前端流程不需要重构。
