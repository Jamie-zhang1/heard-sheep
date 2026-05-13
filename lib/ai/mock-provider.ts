import { buildMockAnalysis } from "@/lib/mock-ai";
import type { AnalyzeMeta } from "@/lib/types";
import type { AnalyzeInput, AnalyzeProviderResult } from "./provider";
import { validateAnalyzeResult } from "./schema";

export function analyzeWithMock(input: AnalyzeInput, meta: AnalyzeMeta): AnalyzeProviderResult {
  const result = validateAnalyzeResult(buildMockAnalysis(input.rawText, input.source));
  return {
    result: {
      ...result,
      meta
    },
    meta
  };
}
