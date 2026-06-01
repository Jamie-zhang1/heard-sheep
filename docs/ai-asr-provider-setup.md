# AI / ASR / Vision Provider 配置

当前生产默认统一接入 Xiaomi MiMo。

## Provider 总览

- 文本分析：`AI_PROVIDER=mimo`，模型 `mimo-v2.5-pro`。
- 图片文字识别：`VISION_PROVIDER=xiaomi-image`，模型 `mimo-v2.5`。
- 音频理解 / 转写：`ASR_PROVIDER=xiaomi-audio`，模型 `mimo-v2.5`。
- Mock fallback：保留，用于本地无 key 演示或真实服务短暂失败时不中断流程。

## 推荐 `.env.local`

```env
NEXT_PUBLIC_BASE_PATH=/sheep

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

`MIMO_API_KEY` 和 `XIAOMI_API_KEY` 可以共用同一个 key。代码读取顺序：

- 文本分析：`MIMO_API_KEY || XIAOMI_API_KEY`
- 图片识别：`XIAOMI_API_KEY || MIMO_API_KEY`
- 音频转写：`XIAOMI_API_KEY || MIMO_API_KEY || ASR_API_KEY`

## Endpoint

当前项目后端使用 Xiaomi MiMo pay-as-you-go OpenAI-compatible endpoint：

```text
https://api.xiaomimimo.com/v1
```

Token Plan key 只用于编程工具；heard-sheep 后端需要按量付费 API key，不能和 Token Plan endpoint/key 混用。

## 文件结构

```text
lib/ai/provider.ts              # 选择文本分析 provider，默认 MiMo
lib/ai/mimo-provider.ts          # /api/analyze 的 MiMo Chat Completions 调用
lib/vision/xiaomi-image-provider.ts
lib/asr/xiaomi-audio-provider.ts
```

## 返回元信息

`/api/analyze` 成功时返回：

```json
{
  "meta": {
    "provider": "mimo",
    "model": "mimo-v2.5-pro",
    "fallbackUsed": false
  }
}
```

`/api/vision/extract-text` 成功时返回 `provider=xiaomi-image`，`model=mimo-v2.5`。

`/api/transcribe` 成功时返回 `provider=xiaomi-audio`，`model=mimo-v2.5`。

## 验证建议

1. `npm run typecheck`
2. `npm run build`
3. 启动 `npm run dev` 后调用：
   - `/sheep/api/analyze`
   - `/sheep/api/vision/extract-text`
   - `/sheep/api/transcribe`

真实图片和音频样本可通过 `npm run eval:multimodal` 批量评测。
