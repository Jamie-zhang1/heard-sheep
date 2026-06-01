import { mockAsrProvider } from "./mock-provider";
import { AsrProviderError, type TranscribeInput, type TranscribeResult } from "./provider";
import { xiaomiAudioProvider } from "./xiaomi-audio-provider";

export async function transcribeAudio(input: TranscribeInput): Promise<TranscribeResult> {
  const configuredProvider = (process.env.ASR_PROVIDER || "xiaomi-audio").toLowerCase();
  const provider = configuredProvider === "mock" ? "mock" : "xiaomi-audio";
  const allowFallback = process.env.ASR_ALLOW_MOCK_FALLBACK !== "false";

  if (configuredProvider !== "xiaomi-audio" && configuredProvider !== "mock") {
    console.warn(`[ASR] Unsupported/legacy ASR_PROVIDER=${configuredProvider}; using Xiaomi MiMo audio instead.`);
  }

  try {
    if (provider === "mock") {
      return await mockAsrProvider.transcribe(input);
    }

    return await xiaomiAudioProvider.transcribe(input);
  } catch (error) {
    if (!allowFallback || provider === "mock") {
      throw error;
    }

    console.warn("[ASR] Provider failed, falling back to mock", error);
    const fallback = await mockAsrProvider.transcribe(input);
    return {
      ...fallback,
      provider: "mock_fallback",
      fallbackUsed: true,
      error: error instanceof Error ? error.message : "Unknown ASR provider error"
    };
  }
}
