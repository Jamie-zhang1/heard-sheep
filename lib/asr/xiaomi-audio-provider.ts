import { Buffer } from "node:buffer";
import { z } from "zod";
import { XIAOMI_AUDIO_TRANSCRIBE_PROMPT } from "./prompts";
import type { AsrProvider, TranscribeInput, TranscribeResult } from "./provider";
import { AsrProviderError } from "./provider";

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

export type XiaomiAudioTranscribeInput = {
  audioBase64: string;
  mimeType?: string;
  filename?: string;
  source: "recording" | "upload";
};

export type XiaomiAudioTranscribeResult = {
  text: string;
  provider: "xiaomi-audio" | "mock" | "openai-compatible";
  model?: string;
  fallbackUsed: boolean;
  error?: string;
};

export const xiaomiAudioProvider: AsrProvider = {
  name: "xiaomi-audio",

  async transcribe(input: TranscribeInput): Promise<TranscribeResult> {
    const apiKey = process.env.XIAOMI_API_KEY || process.env.MIMO_API_KEY || process.env.ASR_API_KEY;
    const baseUrl = (process.env.XIAOMI_BASE_URL || "https://api.xiaomimimo.com/v1").replace(/\/$/, "");
    const model = process.env.XIAOMI_AUDIO_MODEL || "mimo-v2.5";
    const timeoutMs = Number(process.env.XIAOMI_TIMEOUT_MS || process.env.XIAOMI_AUDIO_TIMEOUT_MS || process.env.ASR_TIMEOUT_MS || 60000);

    if (!apiKey) {
      throw new AsrProviderError("XIAOMI_API_KEY is not configured", "XIAOMI_API_KEY_MISSING");
    }
    if (!input.file) {
      throw new AsrProviderError("Audio file is required", "ASR_AUDIO_REQUIRED");
    }

    const audio = await toBase64Audio(input);
    console.log(
      `[ASR] Xiaomi audio request provider=xiaomi-audio model=${model} mime=${audio.mimeType} bytes=${audio.bytes} base64Length=${audio.base64.length}`
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
        messages: buildMessages(audio),
        temperature: 0.1,
        extra_body: { thinking: { type: "disabled" } }
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[ASR] Xiaomi audio API error status=${response.status} body=${body.slice(0, 500)}`);
      throw new AsrProviderError(
        `Xiaomi audio request failed: ${response.status} ${body.slice(0, 300)}`,
        "XIAOMI_AUDIO_REQUEST_FAILED"
      );
    }

    const json = await response.json();
    const parsed = chatCompletionSchema.safeParse(json);
    if (!parsed.success) {
      throw new AsrProviderError(formatZodError(parsed.error), "XIAOMI_AUDIO_RESPONSE_INVALID", parsed.error);
    }

    const message = parsed.data.choices[0].message;
    const text = (message.content || message.reasoning_content || "").trim();
    if (!text) {
      throw new AsrProviderError("Xiaomi audio transcript is empty", "XIAOMI_AUDIO_EMPTY_TRANSCRIPT");
    }

    console.log(
      `[ASR] Xiaomi audio transcription success provider=xiaomi-audio model=${model} textLength=${text.length} preview=${safePreview(text)}`
    );

    return {
      text,
      duration: input.duration,
      source: input.source,
      provider: "xiaomi-audio",
      model,
      fallbackUsed: false
    };
  }
};

function buildMessages(audio: { base64: string; mimeType: string; format: string; dataUrl: string }): ChatMessage[] {
  const inputMode = (process.env.XIAOMI_AUDIO_INPUT_MODE || "input_audio").toLowerCase();
  const audioBlock =
    inputMode === "audio_url"
      ? {
          type: "audio_url",
          audio_url: { url: audio.dataUrl }
        }
      : {
          type: "input_audio",
          input_audio: {
            data: audio.base64,
            format: audio.format
          }
        };

  return [
    {
      role: "user",
      content: [
        { type: "text", text: XIAOMI_AUDIO_TRANSCRIBE_PROMPT },
        audioBlock
      ]
    }
  ];
}

async function toBase64Audio(input: TranscribeInput) {
  const file = input.file;
  if (!file) {
    throw new AsrProviderError("Audio file is required", "ASR_AUDIO_REQUIRED");
  }

  const fileName = input.fileName || "recording.webm";
  const mimeType = inferMimeType(fileName);
  const format = inferAudioFormat(fileName);
  const buffer = Buffer.isBuffer(file)
    ? file
    : Buffer.from(await file.arrayBuffer());

  if (!buffer.length) {
    throw new AsrProviderError("Audio file is empty", "ASR_AUDIO_EMPTY");
  }

  const base64 = buffer.toString("base64");
  return {
    base64,
    mimeType,
    format,
    bytes: buffer.length,
    dataUrl: `data:${mimeType};base64,${base64}`
  };
}

function inferMimeType(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  if (ext === "m4a") return "audio/mp4";
  if (ext === "mp4") return "audio/mp4";
  if (ext === "ogg") return "audio/ogg";
  return "audio/webm";
}

function inferAudioFormat(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "mp3") return "mp3";
  if (ext === "wav") return "wav";
  if (ext === "m4a") return "m4a";
  if (ext === "mp4") return "mp4";
  if (ext === "ogg") return "ogg";
  return "webm";
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
