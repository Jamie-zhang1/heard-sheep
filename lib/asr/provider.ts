import type { SourceType } from "@/lib/types";

export type TranscribeInput = {
  file?: File | Buffer;
  fileName?: string;
  source: Exclude<SourceType, "paste">;
  duration?: number;
};

export type TranscribeResult = {
  text: string;
  duration?: number;
  source: Exclude<SourceType, "paste">;
  provider: string;
  model?: string;
  fallbackUsed?: boolean;
  error?: string;
};

export interface AsrProvider {
  name: string;
  transcribe(input: TranscribeInput): Promise<TranscribeResult>;
}

export class AsrProviderError extends Error {
  constructor(
    message: string,
    public readonly code = "ASR_PROVIDER_FAILED",
    public readonly causeDetail?: unknown
  ) {
    super(message);
    this.name = "AsrProviderError";
  }
}
