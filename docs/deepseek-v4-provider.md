# DeepSeek V4 Provider 配置说明

当前 `/api/analyze` 默认使用 DeepSeek V4 OpenAI-compatible Chat Completions。

## 推荐模型

默认推荐：

```env
DEEPSEEK_MODEL=deepseek-v4-flash
```

原因：

- 支持 JSON Output，适合当前任务提取结构化输出；
- 成本更低，响应更轻，适合 MVP 日常调试；
- 对“口头交代转任务计划”这类文本结构化任务已经足够。

如果后续更看重复杂语义理解、长文本稳定性和更高质量输出，可以切换为：

```env
DEEPSEEK_MODEL=deepseek-v4-pro
```

## `.env.local`

在项目根目录配置：

```env
NEXT_PUBLIC_BASE_PATH=/sheep

AI_PROVIDER=deepseek
AI_ALLOW_MOCK_FALLBACK=true

DEEPSEEK_API_KEY=填你的 DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_TIMEOUT_MS=60000
```

注意：

- API Key 只放在 `.env.local`；
- 不要使用 `NEXT_PUBLIC_` 前缀；
- `.env.local` 已被 `.gitignore` 忽略，不要提交；
- 修改环境变量后需要重启 `npm run dev`。

## 执行逻辑

```text
前端提交转写文本
-> /api/analyze
-> lib/ai/provider.ts 选择 deepseek
-> lib/ai/deepseek-provider.ts 调用 /chat/completions
-> 解析 JSON
-> Zod schema 校验
-> 返回页面可直接渲染的 AnalyzeResult
```

如果未配置 `DEEPSEEK_API_KEY`，或者真实调用失败，且：

```env
AI_ALLOW_MOCK_FALLBACK=true
```

系统会自动回退到 mock，并在返回结果的 `meta` 中标记：

```json
{
  "provider": "mock_fallback",
  "fallbackUsed": true
}
```

真实 DeepSeek 调用成功时：

```json
{
  "provider": "deepseek",
  "model": "deepseek-v4-flash",
  "fallbackUsed": false
}
```

## MiMo 兼容保留

历史 MiMo Provider 仍保留。如需切回：

```env
AI_PROVIDER=mimo
MIMO_API_KEY=填你的 MiMo API Key
MIMO_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5-pro
```

当前默认不再使用 MiMo。
