import { Buffer } from "node:buffer";
import { z } from "zod";
import type { AsrProvider, TranscribeInput, TranscribeResult } from "./provider";
import { AsrProviderError } from "./provider";

const transcriptionResponseSchema = z
  .object({
    text: z.string().min(1),
    duration: z.number().optional(),
    language: z.string().optional()
  })
  .passthrough();

export const openAiCompatibleAsrProvider: AsrProvider = {
  name: "openai-compatible",

  async transcribe(input: TranscribeInput): Promise<TranscribeResult> {
    const apiKey = process.env.ASR_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = (process.env.ASR_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const model = process.env.ASR_MODEL || "whisper-1";
    const language = process.env.ASR_LANGUAGE || "zh";
    const prompt = process.env.ASR_PROMPT;
    const timeoutMs = Number(process.env.ASR_TIMEOUT_MS || 60000);

    if (!apiKey) {
      throw new AsrProviderError("ASR_API_KEY is not configured", "ASR_API_KEY_MISSING");
    }

    const fileName = input.fileName || "recording.webm";
    const uploadFile = toUploadFile(input, fileName);
    const formData = new FormData();
    formData.append("file", uploadFile, fileName);
    formData.append("model", model);
    formData.append("response_format", "json");
    if (language) formData.append("language", language);
    if (prompt) formData.append("prompt", prompt);

    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      signal: AbortSignal.timeout(timeoutMs),
      body: formData
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AsrProviderError(
        `ASR transcription failed: ${response.status} ${body.slice(0, 300)}`,
        "ASR_TRANSCRIBE_FAILED"
      );
    }

    const json = await response.json();
    const parsed = transcriptionResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new AsrProviderError(
        parsed.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`).join("; "),
        "ASR_RESPONSE_INVALID",
        parsed.error
      );
    }

    return {
      text: parsed.data.text.trim(),
      duration: input.duration ?? parsed.data.duration,
      source: input.source,
      provider: "openai-compatible",
      model,
      fallbackUsed: false
    };
  }
};

function toUploadFile(input: TranscribeInput, fileName: string) {
  if (!input.file) {
    throw new AsrProviderError("Audio file is required", "ASR_AUDIO_REQUIRED");
  }

  if (!Buffer.isBuffer(input.file)) {
    return input.file;
  }

  const bytes = new Uint8Array(input.file);
  return new File([bytes], fileName, { type: inferMimeType(fileName) });
}

function inferMimeType(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  if (ext === "m4a") return "audio/mp4";
  if (ext === "webm") return "audio/webm";
  return "application/octet-stream";
}
