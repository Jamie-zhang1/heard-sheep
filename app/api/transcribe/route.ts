import { NextResponse } from "next/server";
import { MAX_AUDIO_BYTES, MAX_RECORDING_SECONDS, formatAudioLimit, formatDurationLimit } from "@/lib/asr/limits";
import { transcribeAudio } from "@/lib/asr/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AudioSource = "recording" | "upload";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const sourceValue = formData.get("source");
    const source: AudioSource = sourceValue === "upload" ? "upload" : "recording";
    const durationValue = Number(formData.get("duration") ?? "");
    const fileName = audio instanceof File ? audio.name : "recording.webm";

    if (!audio || !(audio instanceof File)) {
      return NextResponse.json(
        { code: "AUDIO_REQUIRED", message: "请上传音频文件。" },
        { status: 400 }
      );
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        {
          code: "AUDIO_TOO_LARGE",
          message: `音频文件过大，当前转写上限为 ${formatAudioLimit()}。请缩短录音或改用粘贴转写稿。`
        },
        { status: 413 }
      );
    }

    if (Number.isFinite(durationValue) && durationValue > MAX_RECORDING_SECONDS) {
      return NextResponse.json(
        {
          code: "AUDIO_TOO_LONG",
          message: `录音时间过长，当前建议控制在 ${formatDurationLimit()} 内。请分段录音或改用粘贴转写稿。`
        },
        { status: 413 }
      );
    }

    if (fileName.toLowerCase().includes("fail")) {
      return NextResponse.json(
        { code: "ASR_TRANSCRIBE_FAILED", message: "转写失败，可重试或改用文本输入。" },
        { status: 500 }
      );
    }

    console.log(
      `[ASR] transcribe route source=${source} filename=${fileName} mime=${audio.type || "unknown"} bytes=${audio.size}`
    );

    const result = await transcribeAudio({
      file: audio,
      fileName,
      source,
      duration: Number.isFinite(durationValue) ? durationValue : undefined
    });

    console.log(
      `[ASR] transcribe route result provider=${result.provider} model=${result.model || ""} fallbackUsed=${!!result.fallbackUsed} textLength=${result.text.length}`
    );

    return NextResponse.json({
      ...result,
      meta: {
        provider: result.provider,
        model: result.model,
        fallbackUsed: !!result.fallbackUsed,
        error: result.error
      }
    });
  } catch (error) {
    console.error("[ASR] Transcribe route failed", error);
    return NextResponse.json(
      { code: "ASR_TRANSCRIBE_FAILED", message: "转写失败，可重试或改用文本输入。" },
      { status: 500 }
    );
  }
}
