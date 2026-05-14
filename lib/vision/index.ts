import { createMockVisionResult, mockVisionProvider } from "./mock-provider";
import { VisionProviderError, type VisionExtractionInput, type VisionExtractionResult } from "./provider";
import { xiaomiImageProvider } from "./xiaomi-image-provider";

export async function extractTextFromImage(input: VisionExtractionInput): Promise<VisionExtractionResult> {
  const provider = (process.env.VISION_PROVIDER || "xiaomi-image").toLowerCase();
  const allowFallback = process.env.VISION_ALLOW_TEXT_FALLBACK !== "false";

  try {
    if (provider === "mock") {
      return await mockVisionProvider.extractText(input);
    }

    if (provider === "xiaomi-image" || provider === "xiaomi" || provider === "mimo-image") {
      return await xiaomiImageProvider.extractText(input);
    }

    throw new VisionProviderError(`Unsupported vision provider: ${provider}`, "VISION_PROVIDER_UNSUPPORTED");
  } catch (error) {
    if (!allowFallback || provider === "mock") {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown vision provider error";
    console.warn(`[VISION] provider failed, fallbackUsed=true error=${message}`);
    return createMockVisionResult(input, {
      provider: "fallback",
      fallbackUsed: true,
      error: message
    });
  }
}

export type { VisionExtractionInput, VisionExtractionMeta, VisionExtractionResult } from "./provider";
