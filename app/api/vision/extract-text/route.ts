import { NextResponse } from "next/server";
import { extractTextFromImage } from "@/lib/vision";
import { VisionProviderError } from "@/lib/vision/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      imageBase64?: string;
      mimeType?: string;
      filename?: string;
    };

    if (!body.imageBase64?.trim()) {
      return NextResponse.json(
        { code: "IMAGE_REQUIRED", message: "请先上传图片" },
        { status: 400 }
      );
    }

    const result = await extractTextFromImage({
      imageBase64: body.imageBase64,
      mimeType: body.mimeType,
      filename: body.filename,
      source: "upload"
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[VISION] extract-text route failed", error);
    const isProviderError = error instanceof VisionProviderError;
    return NextResponse.json(
      {
        code: isProviderError ? error.code : "VISION_EXTRACT_TEXT_FAILED",
        message: error instanceof Error ? error.message : "图片识别失败，请稍后重试。",
        meta: {
          provider: "fallback",
          fallbackUsed: true,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      },
      { status: 500 }
    );
  }
}
