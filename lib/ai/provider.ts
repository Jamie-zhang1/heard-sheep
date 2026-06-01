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

type RealProviderConfig = {
  id: "mimo";
  displayName: "Xiaomi MiMo";
  keyName: "MIMO_API_KEY or XIAOMI_API_KEY";
  apiKey?: string;
  model: string;
  supportsImages: boolean;
};

export async function analyzeText(input: AnalyzeInput): Promise<AnalyzeProviderResult> {
  const configuredProvider = (process.env.AI_PROVIDER || "mimo").toLowerCase();
  const provider = configuredProvider === "mock" ? "mock" : "mimo";
  const allowFallback = process.env.AI_ALLOW_MOCK_FALLBACK !== "false";
  const providerConfig = getProviderConfig();
  const hasApiKey = !!providerConfig.apiKey;

  if (configuredProvider !== "mimo" && configuredProvider !== "mock") {
    console.warn(`[AI] Unsupported/legacy AI_PROVIDER=${configuredProvider}; using Xiaomi MiMo instead.`);
  }

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
    const result = await analyzeWithMimo(input);
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

function getProviderConfig(): RealProviderConfig {
  return {
    id: "mimo",
    displayName: "Xiaomi MiMo",
    keyName: "MIMO_API_KEY or XIAOMI_API_KEY",
    apiKey: process.env.MIMO_API_KEY || process.env.XIAOMI_API_KEY,
    model: process.env.MIMO_MODEL || "mimo-v2.5-pro",
    supportsImages: true
  };
}
