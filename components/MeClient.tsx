"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Download,
  SlidersHorizontal,
  Trash2,
  UserRound,
  X
} from "lucide-react";
import { SheepIcon } from "./SheepIcon";
import type { RecordItem } from "@/lib/types";

type Sheet = "none" | "model" | "export" | "calendar" | "privacy" | "clear-confirm";
type ModelOption = "Mock 模型" | "GPT 风格" | "更强分析模式";

const modelOptions: Array<{ label: ModelOption; desc: string }> = [
  { label: "Mock 模型", desc: "当前使用本地 mock 输出，适合 MVP 演示。" },
  { label: "GPT 风格", desc: "占位选项，后续接入真实模型。" },
  { label: "更强分析模式", desc: "占位选项，偏完整拆解和风险检查。" }
];

export function MeClient({ initialRecords }: { initialRecords: RecordItem[] }) {
  const router = useRouter();
  const [records, setRecords] = useState(initialRecords);
  const [sheet, setSheet] = useState<Sheet>("none");
  const [model, setModel] = useState<ModelOption>("Mock 模型");
  const [draftModel, setDraftModel] = useState<ModelOption>("Mock 模型");
  const [toast, setToast] = useState("");
  const [showStorageNote, setShowStorageNote] = useState(false);

  const tasks = useMemo(() => records.flatMap((record) => record.tasks), [records]);
  const done = tasks.filter((task) => task.status === "done").length;
  const totalMinutes = Math.round(records.reduce((sum, record) => sum + (record.audioDuration ?? 0), 0) / 60);
  const usagePercent = Math.min(100, Math.round((totalMinutes / 100) * 100));

  useEffect(() => {
    const saved = window.localStorage.getItem("heard-sheep-model") as ModelOption | null;
    if (saved && modelOptions.some((item) => item.label === saved)) {
      setModel(saved);
      setDraftModel(saved);
    }
  }, []);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function openModelSheet() {
    setDraftModel(model);
    setSheet("model");
  }

  function saveModel() {
    setModel(draftModel);
    window.localStorage.setItem("heard-sheep-model", draftModel);
    setSheet("none");
    showToast("模型设置已更新");
  }

  function exportData(type: "markdown" | "json") {
    if (type === "json") {
      downloadFile("heard-sheep-records.json", JSON.stringify(records, null, 2), "application/json");
      showToast("已导出为 JSON");
    } else {
      downloadFile("heard-sheep-records.md", toMarkdown(records), "text/markdown");
      showToast("已导出为 Markdown");
    }
    setSheet("none");
  }

  async function clearAllData() {
    const response = await fetch("/api/records", { method: "DELETE" });
    if (!response.ok) {
      showToast("清空失败，请稍后重试");
      return;
    }
    setRecords([]);
    setSheet("none");
    showToast("本地数据已清空");
    router.refresh();
  }

  return (
    <>
      <main className="safe-scroll px-5 pb-5">
        <section className="relative mb-5 mt-2 flex flex-col items-center overflow-hidden rounded-3xl border border-brand-light bg-gradient-to-br from-brand-light/50 to-white px-6 pb-5 pt-7 shadow-card">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/10" />
          <div className="relative mb-3 drop-shadow-[0_8px_18px_rgba(124,111,247,0.15)]">
            <SheepIcon variant="front" className="h-24 w-24" />
          </div>
          <div className="text-lg font-bold text-ink">Jamie</div>
          <div className="mt-1 text-[13px] text-muted">职场口头任务捕手</div>
        </section>

        <section className="mb-5 grid grid-cols-3 overflow-hidden rounded-2xl bg-white shadow-card">
          <Stat value={records.length} label="总录音数" onClick={() => router.push("/history?filter=recordings")} />
          <Stat value={tasks.length} label="总待办数" onClick={() => router.push("/tasks?filter=all")} />
          <Stat value={done} label="已完成" onClick={() => router.push("/tasks?filter=done")} />
        </section>

        <section className="mb-5 rounded-2xl bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-bold text-ink">本月录音用量</div>
            <div className="text-[11px] font-semibold text-muted">{totalMinutes} / 100 分钟</div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${usagePercent}%` }} />
          </div>
          <div className="mt-2 text-[11px] leading-5 text-muted">
            参照原型保留用量进度，真实套餐与额度仍为 MVP 占位。
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-card">
          <GroupTitle title="设置" />
          <Setting icon={SlidersHorizontal} title="AI 模型设置" value={model} onClick={openModelSheet} />
          <Setting icon={Download} title="导出数据" value="Markdown / JSON" onClick={() => setSheet("export")} />
          <Setting icon={CalendarDays} title="接入日历" value="待接入" onClick={() => setSheet("calendar")} />
          <Setting icon={UserRound} title="账号与隐私" value="本地 MVP" onClick={() => setSheet("privacy")} />
        </section>
      </main>

      {toast && (
        <div className="absolute bottom-[92px] left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-4 py-2 text-xs font-bold text-white shadow-sheep">
          {toast}
        </div>
      )}

      {sheet !== "none" && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/30">
          <div className="flex max-h-[78vh] w-full flex-col rounded-t-[32px] bg-white shadow-sheep">
            <div className="mx-auto mt-3 h-1 w-9 rounded bg-line" />

            {sheet === "model" && (
              <SheetBody title="AI 模型设置" onClose={() => setSheet("none")}>
                <div className="space-y-2">
                  {modelOptions.map((item) => {
                    const active = draftModel === item.label;
                    return (
                      <button
                        key={item.label}
                        onClick={() => setDraftModel(item.label)}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
                          active ? "border-brand bg-brand-light" : "border-line bg-white"
                        }`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${active ? "border-brand bg-brand text-white" : "border-line"}`}>
                          {active && <Check size={13} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold">{item.label}</span>
                          <span className="mt-1 block text-xs leading-5 text-muted">{item.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <SheetActions primary="保存" onPrimary={saveModel} secondary="取消" onSecondary={() => setSheet("none")} />
              </SheetBody>
            )}

            {sheet === "export" && (
              <SheetBody title="导出数据" onClose={() => setSheet("none")}>
                <div className="space-y-2">
                  <ActionRow icon={Download} title="导出为 Markdown" desc="适合复制到文档或周报" onClick={() => exportData("markdown")} />
                  <ActionRow icon={Download} title="导出为 JSON" desc="保留完整结构化数据" onClick={() => exportData("json")} />
                </div>
                <button onClick={() => setSheet("none")} className="mt-4 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold transition active:bg-surface-2">
                  取消
                </button>
              </SheetBody>
            )}

            {sheet === "calendar" && (
              <SheetBody title="接入日历" onClose={() => setSheet("none")}>
                <div className="rounded-2xl border border-brand-light bg-brand-light/50 p-3 text-[13px] leading-6 text-muted">
                  当前为 MVP 阶段，日历联动能力暂未正式接入。
                </div>
                <div className="mt-3 space-y-2">
                  <FeatureSoon title="Apple 日历" />
                  <FeatureSoon title="Google Calendar" />
                  <FeatureSoon title="Outlook" />
                </div>
                <SheetActions
                  primary="预约此功能"
                  onPrimary={() => {
                    setSheet("none");
                    showToast("已记录你的预约意向");
                  }}
                  secondary="知道了"
                  onSecondary={() => setSheet("none")}
                />
              </SheetBody>
            )}

            {sheet === "privacy" && (
              <SheetBody title="账号与隐私" onClose={() => setSheet("none")}>
                <div className="space-y-2">
                  <div className="rounded-2xl border border-brand-light bg-brand-light/50 p-3 text-[13px] leading-6">
                    <div className="font-bold text-ink">当前为本地 MVP 模式</div>
                    <p className="mt-1 text-muted">历史记录、任务和分析结果主要保存在项目本地 JSON 文件中。</p>
                  </div>
                  <button
                    onClick={() => setShowStorageNote((value) => !value)}
                    className="flex w-full items-center justify-between rounded-2xl border border-line bg-white p-3 text-left text-sm font-bold transition active:bg-surface-2"
                  >
                    查看本地存储说明
                    <ChevronRight size={16} className={showStorageNote ? "rotate-90 transition" : "transition"} />
                  </button>
                  {showStorageNote && (
                    <div className="rounded-2xl border border-line bg-white p-3 text-xs leading-6 text-muted">
                      数据文件位于项目的 data/records.json。清空后会删除当前 MVP 的全部历史记录和任务。
                    </div>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={() => setSheet("clear-confirm")} className="inline-flex h-11 items-center justify-center gap-1 rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-btn transition active:scale-[0.99]">
                    <Trash2 size={15} />
                    清空全部数据
                  </button>
                  <button onClick={() => setSheet("none")} className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-bold transition active:bg-surface-2">
                    返回
                  </button>
                </div>
              </SheetBody>
            )}

            {sheet === "clear-confirm" && (
              <SheetBody title="确认清空数据" onClose={() => setSheet("privacy")}>
                <div className="rounded-2xl border border-line bg-white p-3 text-[13px] leading-6 shadow-card">
                  清空后，本地历史记录和任务会被删除。这个操作适合重置 MVP 演示数据。
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={clearAllData} className="inline-flex h-11 items-center justify-center rounded-xl bg-ink px-4 text-sm font-bold text-white transition active:scale-[0.99]">
                    确认清空
                  </button>
                  <button onClick={() => setSheet("privacy")} className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-bold transition active:bg-surface-2">
                    返回
                  </button>
                </div>
              </SheetBody>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ value, label, onClick }: { value: number; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
        className="group relative border-r border-line py-4 text-center transition hover:bg-brand-light/40 active:bg-brand-light/60 last:border-r-0"
    >
        <span className="absolute right-2 top-2 text-[10px] font-black text-line transition group-hover:text-brand">↗</span>
        <span className="block text-2xl font-bold text-ink">{value}</span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.5px] text-muted">{label}</span>
    </button>
  );
}

function GroupTitle({ title }: { title: string }) {
  return (
    <div className="bg-surface-2 px-5 py-2 text-[11px] font-bold uppercase tracking-[1.5px] text-muted">
      {title}
    </div>
  );
}

function Setting({
  icon: Icon,
  title,
  value,
  onClick
}: {
  icon: typeof SlidersHorizontal;
  title: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between border-b border-line bg-white px-5 py-3.5 text-left transition active:bg-surface-2 last:border-b-0">
      <span className="flex min-w-0 items-center gap-3 text-sm font-semibold">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Icon size={15} />
        </span>
        <span className="truncate">{title}</span>
      </span>
      <span className="ml-3 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted">
        {value}
        <ChevronRight size={14} />
      </span>
    </button>
  );
}

function SheetBody({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center justify-between px-6 py-3">
        <div className="text-base font-black">{title}</div>
        <button onClick={onClose} className="text-muted" aria-label="关闭">
          <X size={20} />
        </button>
      </div>
      <div className="safe-scroll px-6 pb-6">{children}</div>
    </>
  );
}

function SheetActions({
  primary,
  onPrimary,
  secondary,
  onSecondary
}: {
  primary: string;
  onPrimary: () => void;
  secondary: string;
  onSecondary: () => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <button onClick={onSecondary} className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-bold transition active:bg-surface-2">
        {secondary}
      </button>
      <button onClick={onPrimary} className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-btn transition active:scale-[0.99]">
        {primary}
      </button>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  title,
  desc,
  onClick
}: {
  icon: typeof Download;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3 text-left transition active:bg-surface-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
        <Icon size={16} />
      </span>
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className="mt-1 block text-xs text-muted">{desc}</span>
      </span>
    </button>
  );
}

function FeatureSoon({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-3 shadow-card">
      <span className="text-sm font-bold">{title}</span>
      <span className="inline-flex h-7 items-center justify-center rounded-full bg-brand-light px-3 text-[11px] font-bold text-brand">
        即将支持
      </span>
    </div>
  );
}

function downloadFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function toMarkdown(records: RecordItem[]) {
  if (!records.length) return "# 听到了咩导出\n\n暂无记录。\n";
  return records
    .map((record) => {
      const tasks = record.tasks
        .map((task, index) => `${index + 1}. ${task.title}（${task.status}）\n   - 截止：${task.deadlineText || "未明确"}\n   - 依据：${task.sourceEvidence}`)
        .join("\n");
      return `# ${record.title}\n\n${record.summary}\n\n## 任务\n\n${tasks}\n`;
    })
    .join("\n---\n");
}
