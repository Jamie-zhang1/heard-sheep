import type { VisionExtractionInput, VisionExtractionResult, VisionProvider } from "./provider";

export function createMockVisionResult(
  input: VisionExtractionInput,
  meta?: Partial<VisionExtractionResult["meta"]>
): VisionExtractionResult {
  return {
    extractedText: "",
    summary: input.filename
      ? `已收到图片 ${input.filename}，但当前未完成真实图片识别。`
      : "已收到图片，但当前未完成真实图片识别。",
    meta: {
      provider: "mock",
      fallbackUsed: false,
      ...meta
    }
  };
}

export const mockVisionProvider: VisionProvider = {
  name: "mock",
  async extractText(input) {
    return createMockVisionResult(input);
  }
};
