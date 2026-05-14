export type VisionExtractionInput = {
  imageBase64: string;
  mimeType?: string;
  filename?: string;
  source?: "upload" | "paste" | "camera";
};

export type VisionExtractionMeta = {
  provider: "xiaomi-image" | "mock" | "fallback";
  model?: string;
  fallbackUsed: boolean;
  error?: string;
};

export type VisionExtractionResult = {
  extractedText: string;
  summary?: string;
  meta: VisionExtractionMeta;
};

export interface VisionProvider {
  name: string;
  extractText(input: VisionExtractionInput): Promise<VisionExtractionResult>;
}

export class VisionProviderError extends Error {
  constructor(
    message: string,
    public readonly code = "VISION_PROVIDER_FAILED",
    public readonly causeDetail?: unknown
  ) {
    super(message);
    this.name = "VisionProviderError";
  }
}
