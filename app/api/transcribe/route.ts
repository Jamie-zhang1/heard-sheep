import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/asr";

export const dynamic = "force-dynamic";

type AudioSource = "recording" | "upload";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const sourceValue = formData.get("source");
    const source: AudioSource = sourceValue === "upload" ? "upload" : "recording";
    const durationValue = Number(formData.get("duration") ?? "138");
    const fileName = audio instanceof File ? audio.name : "recording.webm";

    if (!audio || !(audio instanceof File)) {
      return NextResponse.json(
        { code: "AUDIO_REQUIRED", message: "请上传音频文件" },
        { status: 400 }
      );
    }

    if (fileName.toLowerCase().includes("fail")) {
      return NextResponse.json(
        { code: "ASR_TRANSCRIBE_FAILED", message: "转写失败，可重试或改用文本输入" },
        { status: 500 }
      );
    }

    const result = await transcribeAudio({
      file: audio,
      fileName,
      source,
      duration: Number.isFinite(durationValue) ? durationValue : undefined
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ASR] Transcribe route failed", error);
    return NextResponse.json(
      { code: "ASR_TRANSCRIBE_FAILED", message: "转写失败，可重试或改用文本输入" },
      { status: 500 }
    );
  }
}
