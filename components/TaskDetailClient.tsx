"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, Edit3, Mic, Play, Save } from "lucide-react";
import { CloseButton, LabelPill, Pill, PriorityBadge, StatusBadge, TaskLabelList, confirmationIssueCount } from "./ui";
import { formatDateTime, formatDuration } from "@/lib/format";
import { apiPath } from "@/lib/api-path";
import type { RecordItem, TaskItem, TaskStatus } from "@/lib/types";
import { labelsByType } from "@/lib/labels";

export function TaskDetailClient({ initialRecord, initialTask }: { initialRecord: RecordItem; initialTask: TaskItem }) {
  const router = useRouter();
  const [task, setTask] = useState(initialTask);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => toForm(initialTask));

  const sourceLabel = initialRecord.source === "recording" ? "原始录音" : initialRecord.source === "upload" ? "上传音频" : "粘贴文本";
  const planItems = useMemo(() => task.steps.filter(Boolean), [task.steps]);

  async function patchTask(patch: Partial<TaskItem>) {
    const response = await fetch(apiPath(`/api/tasks/${task.id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!response.ok) return;
    const data = (await response.json()) as { task: TaskItem };
    setTask(data.task);
    setForm(toForm(data.task));
    router.refresh();
  }

  async function saveEdit() {
    setSaving(true);
    await patchTask({
      title: form.title.trim() || "未命名任务",
      deadlineText: form.deadlineText.trim() || undefined,
      priority: form.priority,
      description: form.description.trim(),
      steps: splitLines(form.steps),
      confirmQuestions: splitLines(form.confirmQuestions),
      status: form.status,
      labels: form.labels
    });
    setSaving(false);
    setEditing(false);
  }

  return (
    <>
      <header className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-4">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-ink-2"
          aria-label="返回"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-base font-bold text-ink">任务详情</h1>
        <button onClick={() => setEditing(true)} className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-2 text-xs font-semibold text-ink-2">
          <Edit3 size={15} />
          编辑
        </button>
      </header>

      <main className="safe-scroll px-5 pb-6">
        <section className="mb-4 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="text-base font-bold leading-snug text-ink">{task.title}</h2>
          <p className="mt-2 text-sm leading-7 text-ink-2">{task.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
            {task.deadlineText && <Tag>{task.deadlineText}</Tag>}
            {task.needConfirm && (
              <button
                type="button"
                onClick={() => document.getElementById("confirm")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="inline-flex !h-6 !min-h-6 !min-w-0 items-center justify-center gap-0.5 whitespace-nowrap rounded-full bg-tag-blue px-2.5 text-[11px] font-semibold leading-none text-[#1D6FB8] transition active:scale-[0.98]"
              >
                去确认{confirmationIssueCount(task) ? ` ${confirmationIssueCount(task)}项` : ""}
                <ChevronRight size={12} />
              </button>
            )}
            <Tag>置信度 {confidenceLabel(task.confidence)}</Tag>
            <button
              onClick={() => setEditing(true)}
              className="inline-flex !h-6 !min-h-6 !min-w-0 items-center justify-center rounded-full bg-surface-2 px-2.5 text-[11px] font-semibold leading-none text-muted transition active:brightness-95"
            >
              标签管理
            </button>
          </div>
          {(task.labels?.length ?? 0) > 0 && (
            <div className="mt-3">
              <TaskLabelList labels={task.labels} />
            </div>
          )}
        </section>

        <section className="mb-5 flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <Mic size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold">{sourceLabel}</div>
            <div className="mt-0.5 truncate text-xs text-muted">
              {initialRecord.audioName || "本地记录"} · {formatDuration(initialRecord.audioDuration)} · {formatDateTime(initialRecord.createdAt)}
            </div>
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-ink-2" aria-label="播放">
            <Play size={12} fill="currentColor" />
          </button>
        </section>

        <DetailSection title="整理后内容">
          <p className="text-sm leading-7">{initialRecord.organizedText.cleanedText}</p>
        </DetailSection>

        <DetailSection title="待办事项">
          <button
            onClick={() => patchTask({ status: task.status === "done" ? "todo" : "done" })}
            className="flex w-full gap-3 rounded-2xl bg-white p-3.5 text-left shadow-card transition active:scale-[0.99]"
          >
            <span className={`mt-0.5 flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border-2 ${task.status === "done" ? "border-[#16A34A] bg-[#16A34A] text-white" : "border-line"}`}>
              {task.status === "done" && <Check size={12} />}
            </span>
            <span>
              <span className={`block text-sm font-semibold leading-5 ${task.status === "done" ? "text-neutral-400 line-through" : ""}`}>
                {task.title}
              </span>
              <span className="mt-1 block text-xs text-muted">点击切换完成状态</span>
            </span>
          </button>
        </DetailSection>

        <DetailSection title="执行方案">
          {planItems.length ? (
            <div className="space-y-2">
              {planItems.map((step, index) => (
                <div key={`${step}-${index}`} className="flex gap-3 rounded-2xl bg-white p-3 shadow-card">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-6">{step}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">暂未生成执行步骤，可在编辑中补充。</p>
          )}
        </DetailSection>

        <DetailSection title="原文依据">
          <div className="rounded-r-2xl border-l-[3px] border-brand bg-brand-light/45 px-3.5 py-3 text-[13px] italic leading-6 text-ink-2">
            {task.sourceEvidence}
          </div>
        </DetailSection>

        <DetailSection title="缺失信息">
          <InfoList items={task.missingInfo} empty="暂无缺失信息。" />
        </DetailSection>

        <DetailSection id="confirm" title="建议确认问题">
          <InfoList items={task.confirmQuestions} empty="暂无建议确认问题。" />
        </DetailSection>

        <DetailSection title="风险提示">
          <div className="rounded-2xl bg-white p-3.5 text-[13px] leading-6 text-ink-2 shadow-card">
            <strong className="text-ink">注意：</strong>
            {task.risk || "暂无风险提示。"}
          </div>
        </DetailSection>
      </main>

      {editing && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/30">
          <div className="flex max-h-[74vh] w-full flex-col rounded-t-[32px] bg-white shadow-sheep">
            <div className="mx-auto mt-3 h-1 w-9 rounded bg-line" />
            <div className="flex items-center justify-between px-6 py-3">
              <div className="text-base font-black">编辑任务</div>
              <CloseButton
                onClick={() => setEditing(false)}
                ariaLabel="关闭编辑"
                className="h-10 w-10 bg-transparent hover:bg-surface-2 active:bg-surface-2"
              />
            </div>
            <div className="safe-scroll px-6 pb-4">
              <Field label="任务标题">
                <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </Field>
              <Field label="截止时间">
                <input className="input" value={form.deadlineText} onChange={(event) => setForm({ ...form, deadlineText: event.target.value })} placeholder="例如：下周三前" />
              </Field>
              <Field label="优先级">
                <div className="grid grid-cols-3 gap-2">
                  {(["high", "medium", "low"] as const).map((priority) => (
                    <button
                      key={priority}
                      onClick={() => setForm({ ...form, priority })}
                      className={`inline-flex h-10 items-center justify-center rounded-xl px-3 text-xs font-semibold leading-none ${
                        form.priority === priority ? "bg-brand text-white shadow-btn" : "bg-surface-2 text-ink-2"
                      }`}
                    >
                      {priority === "high" ? "高" : priority === "medium" ? "中" : "低"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="任务描述">
                <textarea className="textarea" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </Field>
              <Field label="执行步骤">
                <textarea className="textarea" value={form.steps} onChange={(event) => setForm({ ...form, steps: event.target.value })} />
              </Field>
              <Field label="确认问题">
                <textarea className="textarea" value={form.confirmQuestions} onChange={(event) => setForm({ ...form, confirmQuestions: event.target.value })} />
              </Field>
              <Field label="完成状态">
                <select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}>
                  <option value="todo">待处理</option>
                  <option value="doing">进行中</option>
                  <option value="done">已完成</option>
                </select>
              </Field>
              <Field label="标签">
                <div className="space-y-3 rounded-2xl bg-surface-2 p-3">
                  <LabelGroup
                    title="来源"
                    ids={labelsByType("source").map((label) => label.id)}
                    selected={form.labels}
                    onToggle={(id) => setForm({ ...form, labels: toggleLabel(form.labels, id) })}
                  />
                  <LabelGroup
                    title="场景"
                    ids={labelsByType("scenario").map((label) => label.id)}
                    selected={form.labels}
                    onToggle={(id) => setForm({ ...form, labels: toggleLabel(form.labels, id) })}
                  />
                  <LabelGroup
                    title="小羊"
                    ids={labelsByType("system").map((label) => label.id)}
                    selected={form.labels}
                    onToggle={(id) => setForm({ ...form, labels: toggleLabel(form.labels, id) })}
                  />
                </div>
              </Field>
            </div>
            <div className="flex shrink-0 gap-2 border-t border-line px-6 pb-6 pt-3">
              <button onClick={() => setEditing(false)} className="flex-1 rounded-xl bg-surface-2 px-4 py-3 text-sm font-semibold text-ink-2">
                取消
              </button>
              <button onClick={saveEdit} disabled={saving} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-btn disabled:opacity-60">
                <Save size={15} />
                {saving ? "保存中" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DetailSection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-5 scroll-mt-5">
      <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[1.5px] text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="rounded-2xl bg-white p-3.5 shadow-card">
      {items.map((item) => (
        <div key={item} className="flex gap-2 border-b border-line py-2 text-[13px] leading-5 last:border-0">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[1px] text-muted">{label}</div>
      {children}
    </label>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <Pill tone="outline">{children}</Pill>;
}

function LabelGroup({
  title,
  ids,
  selected,
  onToggle
}: {
  title: string;
  ids: string[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[1px] text-muted">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id) => (
          <LabelPill key={id} id={id} selected={selected.includes(id)} onClick={() => onToggle(id)} />
        ))}
      </div>
    </div>
  );
}

function confidenceLabel(confidence: string) {
  if (confidence === "high") return "高";
  if (confidence === "medium") return "中";
  return "低";
}

function toForm(task: TaskItem) {
  return {
    title: task.title,
    deadlineText: task.deadlineText ?? "",
    priority: task.priority,
    description: task.description,
    steps: task.steps.join("\n"),
    confirmQuestions: task.confirmQuestions.join("\n"),
    status: task.status,
    labels: task.labels ?? []
  };
}

function toggleLabel(labels: string[], id: string) {
  if (labels.includes(id)) return labels.filter((label) => label !== id);
  return [...labels, id];
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.replace(/^\s*\d+[.)、]\s*/, "").trim())
    .filter(Boolean);
}
