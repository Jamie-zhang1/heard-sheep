# Xiaomi MiMo Provider 配置说明

当前应用的生产 AI 能力统一使用 Xiaomi MiMo OpenAI-compatible Chat Completions。

## 模型选择

- 文本任务分析：`mimo-v2.5-pro`
  - 用于 `/api/analyze`。
  - 负责把录音转写、粘贴文本或确认后的图片文字整理为结构化 JSON、候选任务、缺失信息和确认问题。
- 图片文字识别：`mimo-v2.5`
  - 用于 `/api/vision/extract-text`。
  - 负责聊天截图、会议截图、图片文本的 OCR 和简要理解。
- 音频理解 / 转写：`mimo-v2.5`
  - 用于 `/api/transcribe` 的 `xiaomi-audio` provider。
  - 通过 OpenAI-compatible multimodal content block 传入 Base64 音频。

## 环境变量

```env
AI_PROVIDER=mimo
AI_ALLOW_MOCK_FALLBACK=true

MIMO_API_KEY=
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5-pro
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
```

`XIAOMI_API_KEY` 可省略；代码会在图片和音频 provider 中回退使用 `MIMO_API_KEY`。

## Endpoint 约束

应用后端必须使用标准 MiMo API：

```text
https://api.xiaomimimo.com/v1
```

Token Plan key 只用于编程工具；heard-sheep 后端需要按量付费 API key，不能和 Token Plan endpoint/key 混用。

## 调用链路

```text
文本 / 已确认转写稿
-> app/api/analyze/route.ts
-> lib/ai/provider.ts
-> lib/ai/mimo-provider.ts
-> /chat/completions, model=mimo-v2.5-pro
```

```text
图片上传
-> app/api/vision/extract-text/route.ts
-> lib/vision/xiaomi-image-provider.ts
-> /chat/completions, model=mimo-v2.5
-> 用户确认文字
-> /api/analyze, model=mimo-v2.5-pro
```

```text
音频上传 / 录音
-> app/api/transcribe/route.ts
-> lib/asr/xiaomi-audio-provider.ts
-> /chat/completions, model=mimo-v2.5
-> 用户确认转写稿
-> /api/analyze, model=mimo-v2.5-pro
```

## Fallback

- `AI_ALLOW_MOCK_FALLBACK=true`：文本分析失败时回退 mock。
- `VISION_ALLOW_TEXT_FALLBACK=true`：图片识别失败时回退为可编辑的提示文本。
- `ASR_ALLOW_MOCK_FALLBACK=true`：音频转写失败时回退 mock。

生产排查时可以临时设为 `false`，让真实错误直接暴露。
