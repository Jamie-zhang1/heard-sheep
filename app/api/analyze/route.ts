import { NextResponse } from "next/server";
import { AnalyzeProviderError, analyzeText } from "@/lib/ai/provider";
import type { SourceType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      raw_text?: string;
      source?: SourceType;
      image_base64?: string;
      images?: string[];
    };

    const rawText = body.raw_text?.trim() ?? "";
    const source = body.source ?? "paste";
    const images = body.images ?? (body.image_base64 ? [body.image_base64] : []);

    // For image source, rawText can be empty (AI will extract from image)
    if (!rawText && images.length === 0) {
      return NextResponse.json(
        { code: "EMPTY_TEXT", message: "请提供文本内容或上传图片" },
        { status: 400 }
      );
    }

    if (rawText.length > 8000) {
      return NextResponse.json(
        { code: "TEXT_TOO_LONG", message: "文本过长，MVP 阶段建议控制在 8000 字以内" },
        { status: 400 }
      );
    }

    if (rawText.includes("__fail_ai__")) {
      return NextResponse.json(
        { code: "AI_ANALYZE_FAILED", message: "AI 分析暂时失败，请重试。" },
        { status: 500 }
      );
    }

    const { result, meta } = await analyzeText({
      rawText: rawText || (images.length > 0 ? `（用户上传了 ${images.length} 张图片，请从图片中识别文字内容）` : ""),
      source,
      images: images.length > 0 ? images : undefined
    });
    if (meta.fallbackUsed) {
      console.warn("[AI] Fallback result returned", meta);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI] Analyze route failed", error);
    return NextResponse.json(
      {
        code: error instanceof AnalyzeProviderError ? error.code : "AI_ANALYZE_FAILED",
        message: error instanceof Error ? error.message : "AI 分析暂时失败，请重试。",
        fallbackUsed: false
      },
      { status: 500 }
    );
  }
}
