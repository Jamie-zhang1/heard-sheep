# 听到了咩 AI / ASR Provider 接入说明

更新时间：2026-05-13  
适用代码：当前 `heard-sheep` Next.js MVP

## 1. 当前状态

- `/api/analyze` 已经 provider 化。
- 当前首选真实 LLM Provider：Xiaomi MiMo OpenAI-compatible Chat Completions。
- 未配置 `MIMO_API_KEY` 或真实调用失败时，可自动回退到 mock AI。
- AI 输出会经过 JSON 解析和 Zod schema 校验，不会无校验直接返回给页面。
- `/api/transcribe` 已经 provider 化。
- 服务端 ASR 当前仍是 mock。
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

AI_PROVIDER=mimo
AI_ALLOW_MOCK_FALLBACK=true

MIMO_API_KEY=
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
MIMO_MODEL=mimo-chat
MIMO_TIMEOUT_MS=30000

ASR_PROVIDER=mock
ASR_ALLOW_MOCK_FALLBACK=true
```

说明：

- `MIMO_API_KEY` 不要写入 `NEXT_PUBLIC_` 变量。
- `MIMO_API_KEY` 只在服务端 API Route / Provider 中读取。
- `.env.local` 已被 `.gitignore` 忽略，不应提交。
- `NEXT_PUBLIC_BASE_PATH` 是公开变量，只用于 Next.js basePath 和客户端 API 路径拼接，不包含敏感信息。

## 3. MiMo Provider

相关文件：

```text
lib/ai/
├─ provider.ts
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
→ MiMo provider 调用 /chat/completions
→ 提取 JSON
→ Zod schema 校验
→ 成功返回结构化 AnalyzeResult
```

如果真实调用失败：

```text
MiMo 请求失败 / JSON 解析失败 / Schema 校验失败
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
    provider: "mimo" | "mock" | "mock_fallback"
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

- `mimo`：真实 MiMo 调用成功。
- `mock`：直接使用 mock，通常因为未配置 `MIMO_API_KEY` 或 `AI_PROVIDER=mock`。
- `mock_fallback`：尝试真实 MiMo 失败后自动回退 mock。

服务端日志会输出：

- `[AI] Provider selection`
- `[AI] Calling MiMo provider`
- `[AI] MiMo provider succeeded`
- `[AI] MiMo provider failed`
- `[AI] Falling back to mock provider`

开发环境下，结果页会在 mock 或 fallback 时显示轻量调试标识。

## 6. ASR Provider

相关文件：

```text
lib/asr/
├─ provider.ts
├─ mock-provider.ts
├─ browser-provider.ts
└─ index.ts
```

当前实现：

- 浏览器端：`browser-provider.ts` 封装 Web Speech API，录音中可显示实时识别文本。
- 服务端：`/api/transcribe` 通过 `lib/asr/index.ts` 调用 provider。
- 服务端当前只有 mock provider。
- `ASR_PROVIDER=browser` 不会让服务端直接使用浏览器 provider，服务端会提示并使用 mock。

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
  provider: string
  fallbackUsed?: boolean
}
```

## 7. 本地验证

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
```

## 8. 后续接真实 ASR 的建议

新增 provider：

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

然后在 `lib/asr/index.ts` 中根据 `ASR_PROVIDER` 选择即可，前端流程不需要重构。
