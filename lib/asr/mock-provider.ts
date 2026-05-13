import { MOCK_TRANSCRIPT } from "@/lib/mock-ai";
import type { AsrProvider, TranscribeInput, TranscribeResult } from "./provider";

export const mockAsrProvider: AsrProvider = {
  name: "mock",
  async transcribe(input: TranscribeInput): Promise<TranscribeResult> {
    return {
      text: MOCK_TRANSCRIPT,
      duration: Number.isFinite(input.duration) && input.duration && input.duration > 0 ? Math.round(input.duration) : 138,
      source: input.source,
      provider: "mock",
      fallbackUsed: false
    };
  }
};
