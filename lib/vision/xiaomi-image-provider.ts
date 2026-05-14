import { z } from "zod";
import { XIAOMI_IMAGE_TEXT_EXTRACTION_PROMPT } from "./prompts";
import type { VisionExtractionInput, VisionExtractionResult, VisionProvider } from "./provider";
import { VisionProviderError } from "./provider";

const chatCompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().optional().default(""),
          reasoning_content: z.string().optional()
        })
      })
    )
    .min(1)
});

type ChatMessage = {
  role: string;
  content: Array<Record<string, unknown>>;
};

export const xiaomiImageProvider: VisionProvider = {
  name: "xiaomi-image",

  async extractText(input: VisionExtractionInput): Promise<VisionExtractionResult> {
    const apiKey = process.env.XIAOMI_API_KEY || process.env.MIMO_API_KEY;
    const baseUrl = (process.env.XIAOMI_BASE_URL || "https://api.xiaomimimo.com/v1").replace(/\/$/, "");
    const model = process.env.XIAOMI_IMAGE_MODEL || "mimo-v2.5";
    const timeoutMs = Number(process.env.XIAOMI_TIMEOUT_MS || 60000);
    const { base64, mimeType, dataUrl, approxBytes } = normalizeImage(input);

    if (!apiKey) {
      throw new VisionProviderError("XIAOMI_API_KEY is not configured", "XIAOMI_API_KEY_MISSING");
    }

    console.log(
      `[VISION] Xiaomi image request provider=xiaomi-image model=${model} mime=${mimeType} bytes=${approxBytes} base64Length=${base64.length}`
    );

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model,
        messages: buildMessages(dataUrl),
        temperature: 0.1,
        extra_body: { thinking: { type: "disabled" } }
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[VISION] Xiaomi image API error status=${response.status} body=${body.slice(0, 500)}`);
      throw new VisionProviderError(
        `Xiaomi image request failed: ${response.status} ${body.slice(0, 300)}`,
        "XIAOMI_IMAGE_REQUEST_FAILED"
      );
    }

    const json = await response.json();
    const parsed = chatCompletionSchema.safeParse(json);
    if (!parsed.success) {
      throw new VisionProviderError(
        formatZodError(parsed.error),
        "XIAOMI_IMAGE_RESPONSE_INVALID",
        parsed.error
      );
    }

    const message = parsed.data.choices[0].message;
    const extractedText = (message.content || message.reasoning_content || "").trim();
    if (!extractedText) {
      throw new VisionProviderError("Xiaomi image extraction returned empty text", "XIAOMI_IMAGE_EMPTY_TEXT");
    }

    console.log(
      `[VISION] Xiaomi image extraction success provider=xiaomi-image model=${model} textLength=${extractedText.length} preview=${safePreview(extractedText)}`
    );

    return {
      extractedText,
      summary: `已识别 ${extractedText.length} 字图片文字`,
      meta: {
        provider: "xiaomi-image",
        model,
        fallbackUsed: false
      }
    };
  }
};

function buildMessages(dataUrl: string): ChatMessage[] {
  return [
    {
      role: "user",
      content: [
        { type: "text", text: XIAOMI_IMAGE_TEXT_EXTRACTION_PROMPT },
        { type: "image_url", image_url: { url: dataUrl } }
      ]
    }
  ];
}

function normalizeImage(input: VisionExtractionInput) {
  const parsed = parseDataUrl(input.imageBase64);
  const mimeType = input.mimeType || parsed.mimeType || "image/png";
  const base64 = parsed.base64 || input.imageBase64;
  const dataUrl = parsed.base64 ? input.imageBase64 : `data:${mimeType};base64,${base64}`;
  const approxBytes = Math.floor((base64.length * 3) / 4);

  if (!base64.trim()) {
    throw new VisionProviderError("Image base64 is empty", "VISION_IMAGE_EMPTY");
  }

  return { base64, mimeType, dataUrl, approxBytes };
}

function parseDataUrl(value: string) {
  const match = value.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return { mimeType: undefined, base64: "" };
  return { mimeType: match[1], base64: match[2] };
}

function formatZodError(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

function safePreview(text: string) {
  return text.replace(/\s+/g, " ").slice(0, 80);
}
