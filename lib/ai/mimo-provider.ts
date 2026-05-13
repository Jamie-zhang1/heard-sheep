import { z } from "zod";
import type { AnalyzeResult } from "@/lib/types";
import { buildAnalyzeMessages, buildRepairMessages } from "./prompts";
import type { AnalyzeInput, AnalyzeProviderResult } from "./provider";
import { formatZodError, validateAnalyzeResult } from "./schema";

const chatCompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
          reasoning_content: z.string().optional()
        })
      })
    )
    .min(1)
});

export async function analyzeWithMimo(input: AnalyzeInput): Promise<AnalyzeProviderResult> {
  const baseUrl = (process.env.MIMO_BASE_URL || "https://api.xiaomimimo.com/v1").replace(/\/$/, "");
  const model = process.env.MIMO_MODEL || "mimo-chat";
  const apiKey = process.env.MIMO_API_KEY;

  if (!apiKey) {
    throw new Error("MIMO_API_KEY is not configured");
  }

  const firstOutput = await requestChatCompletion({
    baseUrl,
    apiKey,
    model,
    messages: buildAnalyzeMessages(input.rawText, input.source, input.images || (input.imageBase64 ? [input.imageBase64] : undefined))
  });

  const firstParsed = parseAndValidate(firstOutput);
  if (firstParsed.ok) {
    return withMeta(firstParsed.value, model);
  }

  console.warn("[AI] MiMo JSON validation failed, retrying repair", firstParsed.error);

  const repairedOutput = await requestChatCompletion({
    baseUrl,
    apiKey,
    model,
    messages: buildRepairMessages(input.rawText, firstOutput, firstParsed.error)
  });

  const repairedParsed = parseAndValidate(repairedOutput);
  if (repairedParsed.ok) {
    return withMeta(repairedParsed.value, model);
  }

  throw new Error(`MiMo output validation failed: ${repairedParsed.error}`);
}

function withMeta(result: AnalyzeResult, model: string): AnalyzeProviderResult {
  const meta = {
    provider: "mimo" as const,
    model,
    fallbackUsed: false
  };

  return {
    result: {
      ...result,
      meta
    },
    meta
  };
}

function parseAndValidate(output: string): { ok: true; value: AnalyzeResult } | { ok: false; error: string } {
  try {
    const json = JSON.parse(extractJson(output));
    return { ok: true, value: validateAnalyzeResult(json) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: formatZodError(error) };
    }
    return { ok: false, error: error instanceof Error ? error.message : "Unknown parse error" };
  }
}

function extractJson(output: string) {
  const trimmed = output.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("Model output does not contain a JSON object");
  }
  return candidate.slice(first, last + 1);
}

type ChatMessage = {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};

async function requestChatCompletion({
  baseUrl,
  apiKey,
  model,
  messages
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
}) {
  const timeoutMs = Number(process.env.MIMO_TIMEOUT_MS || 30000);
  console.log(`[AI] MiMo request: ${baseUrl}/chat/completions, model=${model}, timeout=${timeoutMs}ms`);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" },
      // Disable thinking mode for structured JSON output
      // MiMo thinking returns reasoning_content separately which breaks JSON parsing
      extra_body: { thinking: { type: "disabled" } }
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(`[AI] MiMo API error: status=${response.status}, body=${body.slice(0, 500)}`);
    throw new Error(`MiMo request failed: ${response.status} ${body.slice(0, 300)}`);
  }

  const json = await response.json();
  const parsed = chatCompletionSchema.safeParse(json);
  if (!parsed.success) {
    console.error(`[AI] MiMo response shape invalid:`, JSON.stringify(json).slice(0, 500));
    throw new Error(`MiMo response shape invalid: ${formatZodError(parsed.error)}`);
  }

  const msg = parsed.data.choices[0].message;
  // MiMo thinking mode: reasoning_content holds thinking, content holds the answer
  // If content is empty but reasoning_content exists, the model only returned thinking
  let content = msg.content;
  if (!content && msg.reasoning_content) {
    console.warn(`[AI] MiMo returned empty content with reasoning_content (${msg.reasoning_content.length} chars)`);
    // Try to extract JSON from reasoning_content as fallback
    content = msg.reasoning_content;
  }
  console.log(`[AI] MiMo response length: ${content.length} chars`);
  return content;
}
