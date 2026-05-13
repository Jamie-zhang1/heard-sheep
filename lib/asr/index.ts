import { mockAsrProvider } from "./mock-provider";
import { AsrProviderError, type TranscribeInput, type TranscribeResult } from "./provider";

export { isBrowserAsrAvailable, createSpeechRecognition } from "./browser-provider";

export async function transcribeAudio(input: TranscribeInput): Promise<TranscribeResult> {
  const provider = (process.env.ASR_PROVIDER || "mock").toLowerCase();
  const allowFallback = process.env.ASR_ALLOW_MOCK_FALLBACK !== "false";

  try {
    if (provider === "mock") {
      return await mockAsrProvider.transcribe(input);
    }

    // "browser" provider is handled client-side via createSpeechRecognition()
    // Server-side transcribe route should not use "browser" as provider.
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
      fallbackUsed: true
    };
  }
}
