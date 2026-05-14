import type { AnalyzeMeta, AnalyzeResult, SourceType } from "@/lib/types";
import { analyzeWithDeepSeek } from "./deepseek-provider";
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

type RealProviderConfig =
  | {
      id: "deepseek";
      displayName: "DeepSeek";
      keyName: "DEEPSEEK_API_KEY";
      apiKey?: string;
      model: string;
      supportsImages: boolean;
    }
  | {
      id: "mimo";
      displayName: "MiMo";
      keyName: "MIMO_API_KEY";
      apiKey?: string;
      model: string;
      supportsImages: boolean;
    };

export async function analyzeText(input: AnalyzeInput): Promise<AnalyzeProviderResult> {
  const provider = (process.env.AI_PROVIDER || "deepseek").toLowerCase();
  const allowFallback = process.env.AI_ALLOW_MOCK_FALLBACK !== "false";
  const providerConfig = getProviderConfig(provider);
  const hasApiKey = !!providerConfig.apiKey;

  console.log(
    `[AI] Provider selection: AI_PROVIDER=${provider}, key=${hasApiKey ? "set" : "not set"}, AI_ALLOW_MOCK_FALLBACK=${allowFallback}`
  );

  if (input.images?.length && !providerConfig.supportsImages) {
    throw new AnalyzeProviderError(
      `${providerConfig.displayName} model ${providerConfig.model} does not support image input in the current OpenAI-compatible endpoint.`,
      "IMAGE_PROVIDER_UNSUPPORTED"
    );
  }

  if (provider === "mock" || !providerConfig.apiKey) {
    const reason = provider === "mock"
      ? "AI_PROVIDER is set to 'mock'"
      : `${providerConfig.keyName} is not configured`;
    console.warn(`[AI] Using mock provider: ${reason}`);
    return analyzeWithMock(input, {
      provider: "mock",
      fallbackUsed: false
    });
  }

  try {
    console.log(`[AI] Calling ${providerConfig.displayName} provider (model=${providerConfig.model})`);
    const result = providerConfig.id === "mimo"
      ? await analyzeWithMimo(input)
      : await analyzeWithDeepSeek(input);
    console.log(`[AI] ${providerConfig.displayName} provider succeeded`);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI provider error";
    console.error(`[AI] ${providerConfig.displayName} provider failed: ${message}`, error);

    if (!allowFallback) {
      throw new AnalyzeProviderError(message, "AI_PROVIDER_FAILED", error);
    }

    console.warn("[AI] Falling back to mock provider");
    const fallback = analyzeWithMock(input, {
      provider: "mock_fallback",
      model: providerConfig.model,
      fallbackUsed: true,
      error: message
    });
    fallback.result.warnings = [
      ...fallback.result.warnings,
      "Real AI analysis failed temporarily. The current result is from mock fallback."
    ];
    return fallback;
  }
}

function getProviderConfig(provider: string): RealProviderConfig {
  if (provider === "mimo") {
    return {
      id: "mimo",
      displayName: "MiMo",
      keyName: "MIMO_API_KEY",
      apiKey: process.env.MIMO_API_KEY,
      model: process.env.MIMO_MODEL || "mimo-v2.5-pro",
      supportsImages: process.env.MIMO_SUPPORTS_IMAGES === "true"
    };
  }

  return {
    id: "deepseek",
    displayName: "DeepSeek",
    keyName: "DEEPSEEK_API_KEY",
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.DeepSeek_API_KEY,
    model: process.env.DEEPSEEK_MODEL || process.env.DeepSeek_MODEL || "deepseek-v4-flash",
    supportsImages: process.env.DEEPSEEK_SUPPORTS_IMAGES === "true"
  };
}
