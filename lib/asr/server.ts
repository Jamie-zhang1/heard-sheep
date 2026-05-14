import { mockAsrProvider } from "./mock-provider";
import { openAiCompatibleAsrProvider } from "./openai-compatible-provider";
import { AsrProviderError, type TranscribeInput, type TranscribeResult } from "./provider";
import { xiaomiAudioProvider } from "./xiaomi-audio-provider";

export async function transcribeAudio(input: TranscribeInput): Promise<TranscribeResult> {
  const provider = (process.env.ASR_PROVIDER || "mock").toLowerCase();
  const allowFallback = process.env.ASR_ALLOW_MOCK_FALLBACK !== "false";

  try {
    if (provider === "mock") {
      return await mockAsrProvider.transcribe(input);
    }

    if (provider === "openai" || provider === "openai-compatible" || provider === "whisper") {
      return await openAiCompatibleAsrProvider.transcribe(input);
    }

    // "mimo-audio" is kept only as a legacy alias; new configs should use "xiaomi-audio".
    if (provider === "xiaomi-audio" || provider === "mimo-audio" || provider === "xiaomi-mimo") {
      return await xiaomiAudioProvider.transcribe(input);
    }

    // "browser" provider is handled client-side via createSpeechRecognition().
    if (provider === "browser") {
      console.warn("[ASR] 'browser' provider cannot run server-side, using mock");
      return await mockAsrProvider.transcribe(input);
    }

    throw new AsrProviderError(`Unsupported ASR provider: ${provider}`, "ASR_PROVIDER_UNSUPPORTED");
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
