# 听到了咩 AI / ASR Provider 接入说明

## 当前状态

- UI 主流程已完成：首页录音、上传音频、粘贴转写稿、转写确认、AI 分析、结果页、任务详情、任务编辑、历史记录。
- `/api/analyze` 已支持真实 LLM Provider，当前首选 Xiaomi MiMo OpenAI-compatible API。
- `/api/analyze` 在未配置 API Key 或真实调用失败时，可自动回退到 mock AI。
- `/api/transcribe` 仍使用 mock ASR，但已改造成 provider 架构，后续接真实 ASR 不需要改前端流程。

## 配置 MiMo

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

在 `.env.local` 中配置：

```env
AI_PROVIDER=mimo
AI_ALLOW_MOCK_FALLBACK=true

MIMO_API_KEY=你的 MiMo API Key
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
MIMO_MODEL=你的 MiMo 模型名
MIMO_TIMEOUT_MS=20000

ASR_PROVIDER=mock
ASR_ALLOW_MOCK_FALLBACK=true
```

然后启动：

```bash
npm run dev
```

或生产预览：

```bash
npm run build
npm run start
```

## `/api/analyze` 执行逻辑

1. 前端提交用户确认后的 `raw_text` 和 `source`。
2. API Route 读取服务端环境变量，不向前端暴露 API Key。
3. 如果 `AI_PROVIDER=mock` 或没有配置 `MIMO_API_KEY`，直接使用 mock provider。
4. 如果配置了 MiMo，调用 `${MIMO_BASE_URL}/chat/completions`。
5. 模型输出会先提取 JSON，再用 zod schema 校验。
6. 如果 JSON 解析或 schema 校验失败，会再请求一次模型修复 JSON。
7. 如果仍失败：
   - `AI_ALLOW_MOCK_FALLBACK=true`：返回 mock 结果，并在 `meta.provider` 标记为 `mock_fallback`。
   - `AI_ALLOW_MOCK_FALLBACK=false`：返回结构化错误。

## 如何判断是否调用真实 AI

`/api/analyze` 返回结果里包含：

```ts
meta: {
  provider: "mimo" | "mock" | "mock_fallback"
  model?: string
  fallbackUsed: boolean
  error?: string
}
```

同时服务端控制台会输出：

- `[AI] Using mock provider`
- `[AI] MiMo provider failed`
- `[AI] Fallback result returned`

在开发环境下，如果结果来自 mock 或 fallback，结果页会显示轻量调试标识：`Mock AI` 或 `Fallback`。

## 安全说明

- 不要提交 `.env.local`。
- 不要使用 `NEXT_PUBLIC_` 前缀保存 API Key。
- MiMo API Key 只在服务端 API Route / Provider 中读取。
- `.env.example` 只放占位变量，不包含真实密钥。

## ASR Provider

当前目录：

```text
lib/asr/
├─ provider.ts
├─ mock-provider.ts
└─ index.ts
```

当前只实现：

```env
ASR_PROVIDER=mock
```

后续接真实 ASR 时，只需要新增 provider 并在 `lib/asr/index.ts` 中选择即可，前端录音和上传流程不需要重构。
