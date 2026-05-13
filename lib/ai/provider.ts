import type { AnalyzeMeta, AnalyzeResult, SourceType } from "@/lib/types";
import { analyzeWithMimo } from "./mimo-provider";
import { analyzeWithMock } from "./mock-provider";

export type AnalyzeInput = {
  rawText: string;
  source: SourceType;
  imageBase64?: string;
  images?: string[];
};

export type AnalyzeProviderResult = {
  result: AnalyzeResult;
  meta: AnalyzeMeta;
};

export class AnalyzeProviderError extends Error {
  constructor(
    message: string,
    public readonly code = "AI_PROVIDER_FAILED",
    public readonly causeDetail?: unknown
  ) {
    super(message);
    this.name = "AnalyzeProviderError";
  }
}

export async function analyzeText(input: AnalyzeInput): Promise<AnalyzeProviderResult> {
  const provider = (process.env.AI_PROVIDER || "mimo").toLowerCase();
  const allowFallback = process.env.AI_ALLOW_MOCK_FALLBACK !== "false";
  const hasApiKey = !!process.env.MIMO_API_KEY;

  console.log(`[AI] Provider selection: AI_PROVIDER=${provider}, MIMO_API_KEY=${hasApiKey ? "set" : "not set"}, AI_ALLOW_MOCK_FALLBACK=${allowFallback}`);

  if (provider === "mock" || !process.env.MIMO_API_KEY) {
    const reason = provider === "mock"
      ? "AI_PROVIDER is set to 'mock'"
      : "MIMO_API_KEY is not configured";
    console.warn(`[AI] Using mock provider: ${reason}`);
    return analyzeWithMock(input, {
      provider: "mock",
      fallbackUsed: false
    });
  }

  try {
    console.log(`[AI] Calling MiMo provider (model=${process.env.MIMO_MODEL || "mimo-chat"})`);
    const result = await analyzeWithMimo(input);
    console.log("[AI] MiMo provider succeeded");
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI provider error";
    console.error(`[AI] MiMo provider failed: ${message}`, error);

    if (!allowFallback) {
      throw new AnalyzeProviderError(message, "AI_PROVIDER_FAILED", error);
    }

    console.warn("[AI] Falling back to mock provider");
    const fallback = analyzeWithMock(input, {
      provider: "mock_fallback",
      model: process.env.MIMO_MODEL,
      fallbackUsed: true,
      error: message
    });
    fallback.result.warnings = [
      ...fallback.result.warnings,
      "真实 AI 分析暂时失败，当前结果来自 mock fallback。"
    ];
    return fallback;
  }
}
