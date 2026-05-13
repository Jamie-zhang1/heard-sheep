"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  FileAudio,
  FileText,
  Image,
  Mic,
  Pause,
  Play,
  Square,
  Upload,
  X
} from "lucide-react";
import { SheepIcon } from "./SheepIcon";
import { EmptyState, RecordRow, SectionTitle } from "./ui";
import { formatBytes, formatDuration } from "@/lib/format";
import { createSpeechRecognition, isBrowserAsrAvailable } from "@/lib/asr";
import type { AnalyzeResult, Mark, RecordItem, SourceType } from "@/lib/types";

type Overlay =
  | "none"
  | "record"
  | "upload"
  | "paste"
  | "image"
  | "transcribing"
  | "confirm"
  | "analyzing"
  | "mic-error"
  | "short-recording"
  | "transcribe-error"
  | "ai-error"
  | "no-task";

const EXAMPLE_TEXT =
  "你帮我把这个活动方案再整理一下，明天下午前先给我一个初稿。重点补一下用户画像和预算，竞品案例也可以加两个。预算那里如果没有具体数据，你先按大概范围写，但要标出来。";

const TRANSCRIBE_STEPS = ["正在上传录音", "正在转写语音", "正在整理文字"];
const ANALYZE_STEPS = ["正在整理口头内容", "正在提取待办事项", "正在生成执行方案", "正在检查缺失信息"];

type TranscriptDraft = {
  text: string;
  source: SourceType;
  duration?: number;
  audioName?: string;
};

export function HomeClient({ records }: { records: RecordItem[] }) {
  const router = useRouter();
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<"recording" | "paused">("recording");
  const [seconds, setSeconds] = useState(0);
  const [interimDisplay, setInterimDisplay] = useState("");
  const [shortBlob, setShortBlob] = useState<Blob | null>(null);
  const [shortDuration, setShortDuration] = useState(0);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState("");
  const [allowShortPaste, setAllowShortPaste] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptDraft | null>(null);
  const [confirmedText, setConfirmedText] = useState("");
  const [processStep, setProcessStep] = useState(0);
  const [lastError, setLastError] = useState("");
  const [noTaskRecordId, setNoTaskRecordId] = useState<string | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const stoppingRef = useRef(false);
  const secondsRef = useRef(0);
  const retryAudioRef = useRef<{ blob: Blob; source: SourceType; duration?: number; audioName?: string } | null>(null);
  const speechRecognitionRef = useRef<ReturnType<typeof createSpeechRecognition> | null>(null);
  const interimTextRef = useRef("");
  const browserAsrRef = useRef(isBrowserAsrAvailable());

  // Start SpeechRecognition when recording starts
  useEffect(() => {
    if (overlay !== "record") {
      // Cleanup if we leave recording state
      speechRecognitionRef.current?.abort();
      speechRecognitionRef.current = null;
      interimTextRef.current = "";
      return;
    }
    if (!browserAsrRef.current) return;

    interimTextRef.current = "";
    const sr = createSpeechRecognition({
      lang: "zh-CN",
      onInterim: (text) => {
        interimTextRef.current = text;
      }
    });
    speechRecognitionRef.current = sr;
    sr.start();

    return () => {
      sr.abort();
      speechRecognitionRef.current = null;
      interimTextRef.current = "";
    };
  }, [overlay]);

  const recentRecords = useMemo(() => records.slice(0, 3), [records]);

  useEffect(() => {
    if (overlay !== "record" || recordingStatus !== "recording") return;
    const id = window.setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
    }, 1000);
    // Poll interim text for display
    const interimId = window.setInterval(() => {
      const text = interimTextRef.current;
      setInterimDisplay(text);
    }, 300);
    return () => {
      window.clearInterval(id);
      window.clearInterval(interimId);
    };
  }, [overlay, recordingStatus]);

  useEffect(() => {
    if (overlay !== "transcribing" && overlay !== "analyzing") return;
    const max = overlay === "transcribing" ? TRANSCRIBE_STEPS.length : ANALYZE_STEPS.length;
    setProcessStep(0);
    const id = window.setInterval(() => {
      setProcessStep((value) => Math.min(value + 1, max - 1));
    }, 650);
    return () => window.clearInterval(id);
  }, [overlay]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startRecording() {
    if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) {
      setLastError("当前浏览器不支持录音，请改用粘贴转写稿。");
      setOverlay("mic-error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      stoppingRef.current = false;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        setRecorder(null);
        if (stoppingRef.current) return;
        const finalDuration = secondsRef.current;
        if (finalDuration < 5) {
          speechRecognitionRef.current?.abort();
          speechRecognitionRef.current = null;
          setShortBlob(blob);
          setShortDuration(finalDuration);
          setOverlay("short-recording");
          return;
        }
        // Try to use browser SpeechRecognition result first
        void finishRecordingWithSpeechRecognition(blob, finalDuration);
      };
      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setRecordingStatus("recording");
      secondsRef.current = 0;
      setSeconds(0);
      setOverlay("record");
    } catch {
      setLastError("无法访问麦克风，请在浏览器设置中开启权限，或改用粘贴转写稿。");
      setOverlay("mic-error");
    }
  }

  function cancelRecording() {
    stoppingRef.current = true;
    recorder?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    speechRecognitionRef.current?.abort();
    speechRecognitionRef.current = null;
    setRecorder(null);
    setOverlay("none");
  }

  function togglePause() {
    if (!recorder) return;
    if (recordingStatus === "recording") {
      recorder.pause();
      setRecordingStatus("paused");
    } else {
      recorder.resume();
      setRecordingStatus("recording");
    }
  }

  function addMark() {
    const time = secondsRef.current;
    const label = `标记 ${marks.length + 1}`;
    const newMark: Mark = {
      id: `mark_${Date.now()}`,
      time,
      label,
      createdAt: new Date().toISOString()
    };
    setMarks((prev) => [...prev, newMark]);
  }

  function removeMark(id: string) {
    setMarks((prev) => prev.filter((m) => m.id !== id));
  }

  function finishRecording() {
    if (!recorder) return;
    recorder.stop();
  }

  async function finishRecordingWithSpeechRecognition(blob: Blob, duration: number) {
    const sr = speechRecognitionRef.current;
    speechRecognitionRef.current = null;
    interimTextRef.current = "";

    // Try browser ASR first
    if (sr) {
      try {
        const browserText = await sr.stop();
        if (browserText && browserText.trim().length > 0) {
          const trimmed = browserText.trim();
          const draft: TranscriptDraft = {
            text: trimmed,
            source: "recording",
            duration,
            audioName: "recording.webm"
          };
          setTranscript(draft);
          setConfirmedText(trimmed);
          setOverlay("confirm");
          return;
        }
      } catch (err) {
        console.warn("[ASR] Browser SpeechRecognition failed, falling back to server:", err);
      }
    }

    // Fall back to server-side transcription
    await transcribeAudio(blob, "recording", duration, "recording.webm");
  }

  async function transcribeAudio(blob: Blob, source: SourceType, duration?: number, audioName?: string) {
    setOverlay("transcribing");
    setLastError("");
    retryAudioRef.current = { blob, source, duration, audioName };
    const formData = new FormData();
    formData.append("audio", blob, audioName ?? "recording.webm");
    formData.append("source", source);
    if (duration) formData.append("duration", String(duration));

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData
      });
      if (!response.ok) throw new Error("transcribe failed");
      const data = (await response.json()) as { text: string; duration: number; source: SourceType };
      const draft = {
        text: data.text,
        source: data.source,
        duration: data.duration,
        audioName
      };
      setTranscript(draft);
      setConfirmedText(data.text);
      setOverlay("confirm");
    } catch {
      setLastError("转写失败，可以重试或手动粘贴文本。");
      setOverlay("transcribe-error");
    }
  }

  function handleUploadFile(file: File | null) {
    setUploadError("");
    if (!file) {
      setUploadFile(null);
      return;
    }
    const allowed = ["mp3", "wav", "m4a", "webm"];
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowed.includes(ext)) {
      setUploadError("仅支持 mp3 / wav / m4a / webm 格式。");
      setUploadFile(null);
      return;
    }
    setUploadFile(file);
  }

  async function startUploadTranscribe() {
    if (!uploadFile) {
      setUploadError("请先选择音频文件。");
      return;
    }
    await transcribeAudio(uploadFile, "upload", undefined, uploadFile.name);
  }

  async function submitPaste(force = false) {
    const text = pasteText.trim();
    setPasteError("");
    if (!text) {
      setPasteError("请输入一段口头交代内容。");
      return;
    }
    if (text.length > 8000) {
      setPasteError("文本过长，MVP 阶段建议控制在 8000 字以内。");
      return;
    }
    if (text.length < 20 && !force && !allowShortPaste) {
      setAllowShortPaste(true);
      setPasteError("内容较短，可能无法生成完整任务。可以补充内容，或再次点击继续生成。");
      return;
    }
    const draft = { text, source: "paste" as const };
    setTranscript(draft);
    setConfirmedText(text);
    await analyzeAndSave(draft, text);
  }

  function handleImageFiles(files: FileList | null) {
    setImageError("");
    if (!files || files.length === 0) {
      return;
    }
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    let hasError = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!allowed.includes(file.type)) {
        setImageError("仅支持 PNG / JPG / WebP 格式的图片。");
        hasError = true;
        break;
      }
      if (file.size > 10 * 1024 * 1024) {
        setImageError("单张图片大小不能超过 10MB。");
        hasError = true;
        break;
      }
      if (imageFiles.length + newFiles.length >= 9) {
        setImageError("最多同时上传 9 张图片。");
        hasError = true;
        break;
      }
      newFiles.push(file);
    }

    if (hasError) return;

    // Generate previews
    let loaded = 0;
    for (const file of newFiles) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target?.result as string]);
        loaded++;
      };
      reader.readAsDataURL(file);
    }
    setImageFiles((prev) => [...prev, ...newFiles]);
  }

  function removeImageFile(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitImage() {
    if (imageFiles.length === 0 || imagePreviews.length === 0) {
      setImageError("请先选择图片。");
      return;
    }
    setOverlay("analyzing");
    setLastError("");
    try {
      const analysisResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: "",
          source: "image",
          images: imagePreviews
        })
      });
      if (!analysisResponse.ok) throw new Error("analyze failed");
      const analysis = (await analysisResponse.json()) as AnalyzeResult;
      const saveResponse = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "image",
          rawText: "",
          transcriptText: "",
          audioName: imageFiles.map((f) => f.name).join(", "),
          analysis
        })
      });
      if (!saveResponse.ok) throw new Error("save failed");
      const { record } = (await saveResponse.json()) as { record: RecordItem };
      if (analysis.tasks.length === 0) {
        setNoTaskRecordId(record.id);
        setOverlay("no-task");
        router.refresh();
        return;
      }
      router.push(`/result/${record.id}`);
    } catch {
      setLastError("图片识别失败，请稍后重试。");
      setOverlay("ai-error");
    }
  }

  async function analyzeAndSave(draft = transcript, text = confirmedText) {
    if (!draft || !text.trim()) return;
    setOverlay("analyzing");
    setLastError("");
    try {
      const analysisResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: text.trim(), source: draft.source })
      });
      if (!analysisResponse.ok) throw new Error("analyze failed");
      const analysis = (await analysisResponse.json()) as AnalyzeResult;
      const saveResponse = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: draft.source,
          rawText: text.trim(),
          transcriptText: text.trim(),
          audioName: draft.audioName,
          audioDuration: draft.duration,
          analysis,
          marks: marks.length > 0 ? marks : undefined
        })
      });
      if (!saveResponse.ok) throw new Error("save failed");
      const { record } = (await saveResponse.json()) as { record: RecordItem };
      if (analysis.tasks.length === 0) {
        setNoTaskRecordId(record.id);
        setOverlay("no-task");
        router.refresh();
        return;
      }
      router.push(`/result/${record.id}`);
    } catch {
      setLastError("任务计划生成失败，请稍后重试。");
      setOverlay("ai-error");
    }
  }

  async function addManualTask() {
    if (!noTaskRecordId) return;
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordId: noTaskRecordId,
        title: "手动添加任务",
        description: "请补充任务描述。",
        priority: "medium",
        sourceEvidence: "未识别出明确待办，用户手动添加。",
        needConfirm: true,
        confidence: "medium",
        status: "todo",
        steps: [],
        missingInfo: ["任务目标需要补充"],
        confirmQuestions: ["这条任务的交付物和截止时间是什么？"],
        labels: ["note", "sheep_warn"]
      })
    });
    if (!response.ok) return;
    const { task } = (await response.json()) as { task: { id: string } };
    router.push(`/task/${task.id}`);
  }

  return (
    <>
      <div className="safe-scroll px-5 pb-3">
        <header className="relative mb-5 overflow-hidden px-0 pb-4 pt-2">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light">
                <SheepIcon variant="front" className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-ink">听到了咩</h1>
                <p className="text-[10px] text-muted">AI 语音任务助手</p>
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-brand">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <h2 className="text-[22px] font-bold leading-tight text-ink">下午好，Jamie</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            让每一句交代，都落成清晰行动
          </p>
        </header>

        <div className="mb-6 flex flex-col items-center py-5">
          <div className="relative mb-4 flex items-center justify-center">
            <div className="absolute h-[122px] w-[122px] rounded-full bg-brand opacity-20 shadow-record" />
            <div className="absolute h-[102px] w-[102px] rounded-full bg-brand opacity-10" />
          <button
            onClick={startRecording}
              className="relative flex h-[82px] w-[82px] items-center justify-center rounded-full bg-gradient-to-br from-[#8B7FF8] to-brand text-white shadow-record transition active:scale-95"
            aria-label="开始录音"
          >
              <Mic size={30} strokeWidth={1.8} />
          </button>
          </div>
          <div className="text-center text-sm font-semibold text-ink">
            点击开始录音
          </div>
          <div className="mt-0.5 text-center text-xs text-muted">
            记录口头交代，自动拆解任务
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 justify-center gap-3">
          <button
            onClick={() => setOverlay("upload")}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white px-4 py-3 text-xs font-semibold text-ink-2 shadow-card active:scale-[0.99]"
          >
            <Upload size={16} />
            上传音频
          </button>
          <button
            onClick={() => setOverlay("paste")}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white px-4 py-3 text-xs font-semibold text-ink-2 shadow-card active:scale-[0.99]"
          >
            <FileText size={16} />
            粘贴转写稿
          </button>
          <button
            onClick={() => setOverlay("image")}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white px-4 py-3 text-xs font-semibold text-ink-2 shadow-card active:scale-[0.99]"
          >
            <Image size={16} />
            识别图片
          </button>
        </div>

        <SectionTitle
          title="最近任务"
          action={
            <button onClick={() => router.push("/tasks")} className="text-xs font-semibold text-neutral-400">
              查看全部 ›
            </button>
          }
        />
        <div>
          {recentRecords.length ? (
            recentRecords.map((record) => <RecordRow key={record.id} record={record} href={`/result/${record.id}`} showProgress />)
          ) : (
            <EmptyState title="还没有历史记录" description="先从一次录音开始，生成的任务计划会出现在这里。" />
          )}
        </div>
      </div>

      {overlay === "record" && (
        <FullOverlay dark>
          <div className="flex min-h-0 flex-1 flex-col px-6 pb-10">
            <div className="py-4 text-center">
              <div className="text-[11px] font-bold uppercase tracking-[2px] text-white/40">
                {recordingStatus === "paused" ? "已暂停" : "录音中"}
              </div>
              <div className="mt-2 text-[56px] font-black tracking-[-3px] text-white">{formatTimer(seconds)}</div>
            </div>
            <div className="flex h-24 items-center justify-center gap-1 text-white">
              {Array.from({ length: 28 }).map((_, index) => (
                <span
                  key={index}
                  className="wave-bar"
                  style={{ animationDelay: `${(index % 7) * -0.12}s` }}
                />
              ))}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 text-[13px] leading-7 text-white/70">
              正在记录口头交代。结束后会先转成文字，你可以检查并修改，再生成任务计划。
            </div>
            {browserAsrRef.current && (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                    {interimDisplay ? "实时识别中" : "等待语音输入..."}
                  </span>
                </div>
                <div className="min-h-[40px] text-[13px] leading-6 text-white/60">
                  {interimDisplay || (recordingStatus === "recording" ? "（说话后会在此显示识别文字）" : "（已暂停）")}
                </div>
              </div>
            )}
            <div className="flex-1" />
            {marks.length > 0 && (
              <div className="mb-4 max-h-32 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/50">
                  已标记 {marks.length} 个重点
                </div>
                <div className="space-y-1.5">
                  {marks.map((mark) => (
                    <div key={mark.id} className="flex items-center justify-between text-[12px] text-white/70">
                      <span>📍 {mark.label} · {formatTimer(mark.time)}</span>
                      <button onClick={() => removeMark(mark.id)} className="text-white/40 hover:text-white/70">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={togglePause}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 text-white"
                aria-label={recordingStatus === "recording" ? "暂停" : "继续"}
              >
                {recordingStatus === "recording" ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button
                onClick={addMark}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 text-white"
                aria-label="标记重点"
              >
                📍
              </button>
              <button
                onClick={finishRecording}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-ink"
                aria-label="结束录音"
              >
                <Square size={22} fill="currentColor" />
              </button>
              <button
                onClick={cancelRecording}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 text-white"
                aria-label="取消"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </FullOverlay>
      )}

      {overlay === "upload" && (
        <FullOverlay>
          <PanelHeader title="上传音频" subtitle="支持 mp3 / wav / m4a / webm 格式" onClose={() => setOverlay("none")} />
          <div className="px-6">
            <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-brand/40 bg-white px-5 py-10 text-center shadow-card transition hover:bg-brand-light/40 active:scale-[0.99] active:border-brand">
              <input
                type="file"
                accept=".mp3,.wav,.m4a,.webm,audio/*"
                className="hidden"
                onChange={(event) => handleUploadFile(event.target.files?.[0] ?? null)}
              />
              <FileAudio className="mx-auto mb-2 text-neutral-400" size={42} />
              <p className="text-sm font-semibold text-muted">选择或拖拽音频文件</p>
              <p className="mt-1 text-[11px] text-neutral-400">MVP 阶段使用 mock 转写结果</p>
            </label>
            {uploadFile && (
              <div className="mt-4 rounded-2xl border border-brand-light bg-brand-light/45 p-4">
                <div className="text-sm font-semibold">{uploadFile.name}</div>
                <div className="mt-1 text-xs text-neutral-400">{formatBytes(uploadFile.size)}</div>
              </div>
            )}
            {uploadError && <p className="mt-3 text-xs font-semibold text-ink">{uploadError}</p>}
          </div>
          <div className="flex-1" />
          <div className="flex gap-2 px-6 pb-6">
            <button onClick={() => setOverlay("none")} className="rounded-xl px-4 py-3 text-sm font-semibold text-muted transition active:bg-surface-2">
              取消
            </button>
            <button onClick={startUploadTranscribe} className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-btn transition active:scale-[0.99]">
              开始转写
            </button>
          </div>
        </FullOverlay>
      )}

      {overlay === "paste" && (
        <FullOverlay>
          <PanelHeader title="粘贴转写稿" subtitle="粘贴微信转文字、会议转写稿或口头交代内容" onClose={() => setOverlay("none")} />
          <div className="px-6">
            <textarea
              value={pasteText}
              onChange={(event) => {
                setPasteText(event.target.value);
                setPasteError("");
                setAllowShortPaste(false);
              }}
              className="h-[210px] w-full resize-none rounded-2xl border border-line bg-white p-3.5 text-sm leading-7 outline-none transition focus:border-brand"
              placeholder="在这里粘贴或输入内容..."
            />
            <div className="mt-1.5 text-[11px] text-neutral-400">建议 20-8000 字，过短可能无法完整分析</div>
            {pasteError && <div className="mt-2 text-xs font-semibold leading-5 text-ink">{pasteError}</div>}
          </div>
          <div className="mt-3 flex gap-2 px-6">
            <button
              onClick={() => {
                setPasteText(EXAMPLE_TEXT);
                setPasteError("");
                setAllowShortPaste(false);
              }}
              className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-muted"
            >
              示例文本
            </button>
            <button
              onClick={() => {
                setPasteText("");
                setPasteError("");
                setAllowShortPaste(false);
              }}
              className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-muted"
            >
              清空
            </button>
          </div>
          <div className="flex-1" />
          <div className="flex gap-2 px-6 pb-6">
            <button onClick={() => setOverlay("none")} className="rounded-xl px-4 py-3 text-sm font-semibold text-muted transition active:bg-surface-2">
              取消
            </button>
            <button
              onClick={() => submitPaste(allowShortPaste)}
              className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-btn transition active:scale-[0.99]"
            >
              确认并生成任务
            </button>
          </div>
        </FullOverlay>
      )}

      {overlay === "image" && (
        <FullOverlay>
          <PanelHeader title="识别图片" subtitle="上传聊天截图、会议截图等，AI 自动识别内容" onClose={() => setOverlay("none")} />
          <div className="px-6">
            <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-brand/40 bg-white px-5 py-8 text-center shadow-card transition hover:bg-brand-light/40 active:scale-[0.99] active:border-brand">
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,image/*"
                multiple
                className="hidden"
                onChange={(event) => handleImageFiles(event.target.files)}
              />
              <Image className="mx-auto mb-2 text-neutral-400" size={42} />
              <p className="text-sm font-semibold text-muted">选择或拖拽图片</p>
              <p className="mt-1 text-[11px] text-neutral-400">支持多选，最多 9 张，PNG / JPG / WebP</p>
            </label>
            {imagePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`预览 ${index + 1}`}
                      className="h-24 w-full rounded-xl object-cover"
                    />
                    <button
                      onClick={() => removeImageFile(index)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                    >
                      <X size={12} />
                    </button>
                    <div className="mt-1 truncate text-[10px] text-neutral-400">
                      {imageFiles[index]?.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {imageError && <p className="mt-3 text-xs font-semibold text-ink">{imageError}</p>}
          </div>
          <div className="flex-1" />
          <div className="flex gap-2 px-6 pb-6">
            <button onClick={() => { setOverlay("none"); setImageFiles([]); setImagePreviews([]); }} className="rounded-xl px-4 py-3 text-sm font-semibold text-muted transition active:bg-surface-2">
              取消
            </button>
            <button
              onClick={submitImage}
              className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-btn transition active:scale-[0.99]"
            >
              识别 {imageFiles.length > 0 ? `(${imageFiles.length} 张)` : ""}并生成任务
            </button>
          </div>
        </FullOverlay>
      )}

      {overlay === "transcribing" && (
        <ProcessingOverlay title="正在把录音转成文字..." subtitle="稍等一下，我在认真听" steps={TRANSCRIBE_STEPS} activeStep={processStep} />
      )}

      {overlay === "confirm" && transcript && (
        <FullOverlay>
          <PanelHeader title="转写确认" subtitle="你可以先检查和修改转写内容" onClose={() => setOverlay("none")} />
          <div className="flex flex-wrap gap-2 px-6 pb-3">
            <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-muted">
              {transcript.source === "recording" ? "录音" : "上传"}
            </span>
            {transcript.duration && (
              <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-muted">
                {formatDuration(transcript.duration)}
              </span>
            )}
          </div>
          <div className="px-6">
            <textarea
              value={confirmedText}
              onChange={(event) => setConfirmedText(event.target.value)}
              className="h-[260px] w-full resize-none rounded-2xl border border-line bg-white p-3.5 text-[13px] leading-7 outline-none transition focus:border-brand"
            />
          </div>
          <div className="flex-1" />
          <div className="space-y-2 px-6 pb-6">
            <button onClick={() => analyzeAndSave()} className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-btn transition active:scale-[0.99]">
              确认并生成任务
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const retry = retryAudioRef.current;
                  if (retry) void transcribeAudio(retry.blob, retry.source, retry.duration, retry.audioName);
                }}
                className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold transition active:bg-surface-2"
              >
                重新转写
              </button>
              <button onClick={() => setOverlay("none")} className="rounded-xl px-4 py-3 text-sm font-semibold text-muted transition active:bg-surface-2">
                返回
              </button>
            </div>
          </div>
        </FullOverlay>
      )}

      {overlay === "analyzing" && (
        <ProcessingOverlay title="正在帮你拆解任务..." subtitle="马上就好" steps={ANALYZE_STEPS} activeStep={processStep} />
      )}

      {overlay === "mic-error" && (
        <ErrorOverlay
          title="无法访问麦克风"
          description={lastError || "请在浏览器设置中开启麦克风权限，或改用粘贴转写稿。"}
          primaryLabel="重新授权"
          onPrimary={startRecording}
          secondaryLabel="粘贴转写稿"
          onSecondary={() => setOverlay("paste")}
          icon="mic"
        />
      )}

      {overlay === "short-recording" && (
        <ErrorOverlay
          title="录音内容较短"
          description="录音内容较短，可能无法识别完整任务。"
          primaryLabel="重新录音"
          onPrimary={() => {
            setShortBlob(null);
            void startRecording();
          }}
          secondaryLabel="继续处理"
          onSecondary={() => shortBlob && transcribeAudio(shortBlob, "recording", shortDuration, "recording.webm")}
          icon="warn"
        />
      )}

      {overlay === "transcribe-error" && (
        <ErrorOverlay
          title="转写失败了"
          description={lastError || "可以重试或手动粘贴文本。"}
          primaryLabel="重新转写"
          onPrimary={() => {
            const retry = retryAudioRef.current;
            if (retry) void transcribeAudio(retry.blob, retry.source, retry.duration, retry.audioName);
          }}
          secondaryLabel="粘贴转写稿"
          onSecondary={() => setOverlay("paste")}
          icon="fail"
        />
      )}

      {overlay === "ai-error" && (
        <ErrorOverlay
          title="任务计划生成失败"
          description={lastError || "请稍后重试。"}
          primaryLabel="重新生成"
          onPrimary={() => analyzeAndSave()}
          secondaryLabel="返回转写确认页"
          onSecondary={() => setOverlay("confirm")}
          icon="warn"
        />
      )}

      {overlay === "no-task" && (
        <ErrorOverlay
          title="未发现明确待办"
          description="这段内容里没有发现明确待办，你可以手动添加任务，或返回修改文本。"
          primaryLabel="手动添加任务"
          onPrimary={addManualTask}
          secondaryLabel="返回修改文本"
          onSecondary={() => setOverlay(transcript?.source === "paste" ? "paste" : "confirm")}
          icon="ok"
        />
      )}
    </>
  );
}

function FullOverlay({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`absolute inset-0 z-30 flex flex-col overflow-hidden rounded-[30px] ${dark ? "bg-gradient-to-br from-ink to-[#322b66] text-white" : "bg-paper text-ink"}`}>
      {children}
    </div>
  );
}

function PanelHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="shrink-0 px-6 pb-4 pt-5 text-center">
      <button onClick={onClose} className="absolute right-6 top-5 rounded-full bg-surface-2 p-1.5 text-muted transition active:scale-95" aria-label="关闭">
        <X size={18} />
      </button>
      <h2 className="text-lg font-black">{title}</h2>
      {subtitle && <p className="mt-1 text-xs leading-5 text-muted">{subtitle}</p>}
    </div>
  );
}

function ProcessingOverlay({
  title,
  subtitle,
  steps,
  activeStep
}: {
  title: string;
  subtitle: string;
  steps: string[];
  activeStep: number;
}) {
  return (
    <FullOverlay>
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <SheepIcon variant="thinking" className="mb-6 h-28 w-28 processing-dot" />
        <div className="text-base font-bold">{title}</div>
        <div className="mb-6 mt-2 text-[13px] text-muted">{subtitle}</div>
        <div className="w-full max-w-[280px] space-y-2">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`flex items-center gap-2.5 rounded-2xl px-3.5 py-2 text-[13px] transition ${
                index === activeStep
                  ? "bg-brand font-semibold text-white shadow-btn"
                  : index < activeStep
                    ? "bg-brand-light/70 text-muted line-through"
                    : "bg-white text-neutral-400 shadow-card"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${index === activeStep ? "bg-white" : "bg-neutral-400"}`} />
              {step}
            </div>
          ))}
        </div>
      </div>
    </FullOverlay>
  );
}

function ErrorOverlay({
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  icon
}: {
  title: string;
  description: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
  icon: "mic" | "warn" | "fail" | "ok";
}) {
  const Icon = icon === "mic" ? Mic : icon === "ok" ? CheckCircle2 : icon === "fail" ? X : AlertTriangle;
  return (
    <FullOverlay>
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-brand shadow-card">
          <Icon size={28} />
        </div>
        <div className="text-base font-bold">{title}</div>
        <p className="mb-6 mt-2 max-w-[280px] text-[13px] leading-6 text-muted">{description}</p>
        <div className="w-full max-w-[260px] space-y-2">
          <button onClick={onPrimary} className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-btn transition active:scale-[0.99]">
            {primaryLabel}
          </button>
          <button onClick={onSecondary} className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold transition active:bg-surface-2">
            {secondaryLabel}
          </button>
        </div>
      </div>
    </FullOverlay>
  );
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
