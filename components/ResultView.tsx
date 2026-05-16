"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  Edit3,
  Info,
  Plus,
  Route,
  Save,
  Text
} from "lucide-react";
import {
  CloseButton,
  ConfirmationBadge,
  LabelPill,
  Pill,
  PriorityBadge,
  TaskLabelList
} from "./ui";
import { formatDateTime, formatDuration } from "@/lib/format";
import { labelsByType } from "@/lib/labels";
import { apiPath } from "@/lib/api-path";
import type { CandidateTaskItem, Priority, RecordItem, TaskItem } from "@/lib/types";

type Tab = "text" | "tasks" | "plan";
type CandidateForm = ReturnType<typeof toCandidateForm>;
type ConfirmationFormItem = { id: string; question: string; answer: string };

const tabs: Array<{ key: Tab; label: string; icon: typeof Text }> = [
  { key: "text", label: "整理文本", icon: Text },
  { key: "tasks", label: "候选任务", icon: ClipboardList },
  { key: "plan", label: "执行方案", icon: Route }
];

export function ResultView({ record }: { record: RecordItem }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "tasks" ? "tasks" : searchParams.get("tab") === "plan" ? "plan" : "text";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [candidates, setCandidates] = useState<CandidateTaskItem[]>(() => initialCandidateTasks(record));
  const [joinedTasks, setJoinedTasks] = useState(record.tasks);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [batchSaving, setBatchSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CandidateForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmationForm, setConfirmationForm] = useState<ConfirmationFormItem[]>([]);
  const [savingConfirmation, setSavingConfirmation] = useState(false);

  const pendingCandidates = candidates.filter((task) => task.candidateStatus !== "added");
  const addedCandidates = candidates.filter((task) => task.candidateStatus === "added");
  const selectedPendingIds = selectedIds.filter((id) => pendingCandidates.some((task) => task.id === id));
  const allPendingSelected = pendingCandidates.length > 0 && selectedPendingIds.length === pendingCandidates.length;
  const orderedCandidates = useMemo(
    () => [...candidates].sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority)),
    [candidates]
  );
  const showAiMeta =
    process.env.NODE_ENV !== "production" &&
    record.aiMeta &&
    (record.aiMeta.fallbackUsed || record.aiMeta.provider === "mock" || record.aiMeta.provider === "mock_fallback");

  function toggleSelected(id: string) {
    setSelectedIds((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
  }

  function toggleAllPending() {
    setSelectedIds(allPendingSelected ? [] : pendingCandidates.map((task) => task.id));
  }

  function openEdit(candidate: CandidateTaskItem) {
    if (candidate.candidateStatus === "added") return;
    setEditingId(candidate.id);
    setForm(toCandidateForm(candidate));
  }

  function openConfirm(candidate: CandidateTaskItem) {
    if (candidate.candidateStatus === "added") return;
    setConfirmingId(candidate.id);
    setConfirmationForm(toConfirmationForm(candidate));
  }

  async function saveCandidateConfirmation() {
    if (!confirmingId) return;
    const answers = confirmationForm.map((item) => ({
      id: item.id,
      question: item.question,
      answer: item.answer.trim(),
      resolved: Boolean(item.answer.trim()),
      updatedAt: new Date().toISOString()
    }));
    const allAnswered = answers.length > 0 && answers.every((item) => item.resolved);
    const patch: Partial<CandidateTaskItem> = {
      confirmationAnswers: answers,
      needConfirm: !allAnswered
    };
    const nextCandidates = candidates.map((candidate) =>
      candidate.id === confirmingId ? { ...candidate, ...patch } : candidate
    );
    setSavingConfirmation(true);
    setCandidates(nextCandidates);
    try {
      const response = await fetch(apiPath(`/api/records/${record.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateTasks: nextCandidates })
      });
      if (!response.ok) throw new Error("save confirmation failed");
      const data = (await response.json()) as { record: RecordItem };
      setCandidates(initialCandidateTasks(data.record));
      setConfirmingId(null);
      setConfirmationForm([]);
      router.refresh();
    } catch {
      setCandidates(candidates);
    } finally {
      setSavingConfirmation(false);
    }
  }

  async function saveCandidateEdit() {
    if (!editingId || !form) return;
    const patch = formToCandidatePatch(form);
    const nextCandidates = candidates.map((candidate) =>
      candidate.id === editingId ? { ...candidate, ...patch } : candidate
    );
    setSavingEdit(true);
    setCandidates(nextCandidates);
    try {
      const response = await fetch(apiPath(`/api/records/${record.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateTasks: nextCandidates })
      });
      if (!response.ok) throw new Error("save candidate failed");
      const data = (await response.json()) as { record: RecordItem };
      setCandidates(initialCandidateTasks(data.record));
      setEditingId(null);
      setForm(null);
      router.refresh();
    } catch {
      setCandidates(candidates);
    } finally {
      setSavingEdit(false);
    }
  }

  async function addCandidate(candidate: CandidateTaskItem) {
    if (candidate.candidateStatus === "added" || busyId || batchSaving) return;
    setBusyId(candidate.id);
    try {
      const response = await fetch(apiPath("/api/tasks"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: record.id,
          candidateId: candidate.id,
          ...candidateToTaskPayload(candidate)
        })
      });
      if (!response.ok) throw new Error("add candidate failed");
      const data = (await response.json()) as { task: TaskItem; record: RecordItem };
      setJoinedTasks(data.record.tasks);
      setCandidates(initialCandidateTasks(data.record));
      setSelectedIds((items) => items.filter((id) => id !== candidate.id));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function addSelectedCandidates() {
    if (!selectedPendingIds.length || batchSaving) return;
    setBatchSaving(true);
    try {
      const selectedCandidates = candidates.filter((candidate) => selectedPendingIds.includes(candidate.id));
      const response = await fetch(apiPath("/api/tasks"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: record.id,
          candidates: selectedCandidates.map((candidate) => ({
            id: candidate.id,
            patch: candidateToTaskPayload(candidate)
          }))
        })
      });
      if (!response.ok) throw new Error("batch add candidates failed");
      const data = (await response.json()) as { record: RecordItem };
      setJoinedTasks(data.record.tasks);
      setCandidates(initialCandidateTasks(data.record));
      setSelectedIds([]);
      router.refresh();
    } finally {
      setBatchSaving(false);
    }
  }

  return (
    <>
      <header className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-4">
        <button
          onClick={() => router.push("/")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-ink-2"
          aria-label="返回首页"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-bold text-ink">AI 分析结果</h1>
            {showAiMeta && (
              <span className="inline-flex h-5 items-center justify-center rounded-full bg-brand-light px-2 text-[10px] font-bold text-brand">
                {record.aiMeta?.fallbackUsed ? "Fallback" : "Mock AI"}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted">
            {candidates.length} 项候选 · {joinedTasks.length} 项已加入任务清单
          </p>
        </div>
        <button
          onClick={() => router.push("/history")}
          className="rounded-full bg-surface-2 px-3 py-2 text-xs font-semibold text-ink-2"
        >
          历史
        </button>
      </header>
      <div className="mx-5 mb-3 flex shrink-0 gap-2 text-[11px] font-medium text-muted">
        <span>{formatDateTime(record.createdAt)}</span>
        <span>·</span>
        <span>{record.source === "recording" ? "录音" : record.source === "upload" ? "上传" : record.source === "image" ? "图片" : "粘贴稿"}</span>
        <span>·</span>
        <span>{formatDuration(record.audioDuration)}</span>
      </div>
      <div className="mx-5 flex shrink-0 rounded-2xl bg-surface-2 p-1">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-semibold transition ${
                tab === item.key ? "bg-white text-ink shadow-card" : "text-muted"
              }`}
            >
              <Icon size={14} />
              {item.label}
            </button>
          );
        })}
      </div>
      <main className="safe-scroll px-5 py-4">
        {tab === "text" && (
          <div className="space-y-2">
            {record.marks && record.marks.length > 0 && (
              <ResultBlock title={`录音标记（${record.marks.length} 个重点）`}>
                <div className="space-y-1.5">
                  {record.marks.map((mark) => (
                    <div key={mark.id} className="flex items-center gap-2 text-[12px]">
                      <span className="text-brand">标记</span>
                      <span className="font-medium text-ink">{mark.label}</span>
                      <span className="text-muted">
                        {Math.floor(mark.time / 60)}:{String(mark.time % 60).padStart(2, "0")}
                      </span>
                    </div>
                  ))}
                </div>
              </ResultBlock>
            )}
            <ResultBlock title="核心摘要">
              <p className="text-sm leading-7">{record.summary}</p>
            </ResultBlock>
            <ResultBlock title="关键要求">
              <List items={record.organizedText.keyPoints} />
            </ResultBlock>
            <ResultBlock title="时间信息">
              {record.organizedText.timeMentions.length ? (
                <div className="flex flex-wrap gap-2">
                  {record.organizedText.timeMentions.map((item) => (
                    <Pill key={item} tone="dark">
                      {item}
                    </Pill>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">未发现明确时间。</p>
              )}
            </ResultBlock>
            <ResultBlock title="整理后内容">
              <p className="text-sm leading-7">{record.organizedText.cleanedText}</p>
            </ResultBlock>
            {record.organizedText.specialRequirements.length > 0 && (
              <ResultBlock title="特殊要求">
                <List items={record.organizedText.specialRequirements} />
              </ResultBlock>
            )}
          </div>
        )}

        {tab === "tasks" && (
          <div className="space-y-3">
            <ResultBlock title="加入任务清单">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-sm leading-6 text-ink-2">
                  AI 生成的内容会先停在候选区，只有确认加入后才会出现在任务页。
                </div>
                <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-muted">
                  {addedCandidates.length}/{candidates.length}
                </span>
              </div>
              {pendingCandidates.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={toggleAllPending}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink-2 transition active:bg-surface-2"
                  >
                    {allPendingSelected ? "取消全选" : "全选候选"}
                  </button>
                  <button
                    type="button"
                    onClick={addSelectedCandidates}
                    disabled={!selectedPendingIds.length || batchSaving}
                    className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-brand px-3 text-xs font-bold text-white shadow-btn transition active:scale-[0.99] disabled:opacity-50"
                  >
                    <CheckCheck size={14} />
                    {batchSaving ? "加入中" : `批量加入 ${selectedPendingIds.length ? selectedPendingIds.length : ""}`}
                  </button>
                </div>
              )}
            </ResultBlock>

            {candidates.length ? (
              candidates.map((candidate) => (
                <CandidateTaskCard
                  key={candidate.id}
                  candidate={candidate}
                  selected={selectedIds.includes(candidate.id)}
                  busy={busyId === candidate.id}
                  onSelect={() => toggleSelected(candidate.id)}
                  onEdit={() => openEdit(candidate)}
                  onConfirm={() => openConfirm(candidate)}
                  onAdd={() => addCandidate(candidate)}
                  onOpenTask={(taskId) => router.push(`/task/${taskId}`)}
                />
              ))
            ) : (
              <ResultBlock title="未发现明确待办">
                <p className="text-sm leading-7 text-muted">这条记录仍会保留在历史中，后续可回看整理文本和分析摘要。</p>
              </ResultBlock>
            )}
          </div>
        )}

        {tab === "plan" && (
          <div className="space-y-2">
            <ResultBlock title="推荐执行顺序">
              {orderedCandidates.length ? (
                <div className="space-y-3">
                  {orderedCandidates.map((task, index) => (
                    <div key={task.id} className="flex gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold leading-5">{task.title}</div>
                        <div className="mt-1 text-[11px] text-muted">{task.priorityReason || "按依赖和截止时间排序。"}</div>
                      </div>
                      {task.candidateStatus === "added" && (
                        <span className="shrink-0 rounded-full bg-tag-green px-2 py-1 text-[10px] font-bold text-[#16A34A]">
                          已加入
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">暂未生成执行顺序。</p>
              )}
            </ResultBlock>
            <ResultBlock title="缺失信息">
              <List items={unique(candidates.flatMap((task) => task.missingInfo))} empty="暂无缺失信息。" />
            </ResultBlock>
            <ResultBlock title="建议确认问题">
              <List items={unique([...record.globalConfirmQuestions, ...candidates.flatMap((task) => task.confirmQuestions)])} empty="暂无建议确认问题。" />
            </ResultBlock>
            <ResultBlock title="风险提示">
              <List
                items={unique([...record.warnings, ...(candidates.map((task) => task.risk).filter(Boolean) as string[])])}
                empty="暂无风险提示。"
              />
            </ResultBlock>
          </div>
        )}
      </main>

      {confirmingId && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/30">
          <div className="flex max-h-[76vh] w-full flex-col rounded-t-[32px] bg-white shadow-sheep">
            <div className="mx-auto mt-3 h-1 w-9 rounded bg-line" />
            <div className="flex items-center justify-between px-6 py-3">
              <div className="text-base font-black">确认任务信息</div>
              <CloseButton
                onClick={() => {
                  setConfirmingId(null);
                  setConfirmationForm([]);
                }}
                ariaLabel="关闭确认"
                className="h-10 w-10 bg-transparent hover:bg-surface-2 active:bg-surface-2"
              />
            </div>
            <div className="safe-scroll px-6 pb-4">
              {confirmationForm.length ? (
                <div className="space-y-3">
                  {confirmationForm.map((item, index) => (
                    <label key={item.id} className="block rounded-2xl border border-line bg-white p-3 shadow-card">
                      <div className="mb-2 flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-light text-[10px] font-bold text-brand">
                          {index + 1}
                        </span>
                        <span className="text-[13px] font-semibold leading-5 text-ink">{item.question}</span>
                      </div>
                      <textarea
                        className="textarea min-h-[86px]"
                        value={item.answer}
                        onChange={(event) =>
                          setConfirmationForm((items) =>
                            items.map((current) => (current.id === item.id ? { ...current, answer: event.target.value } : current))
                          )
                        }
                        placeholder="在这里补充确认后的答案或处理结论"
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl bg-surface-2 p-4 text-sm leading-6 text-muted">
                  这条任务暂无需要确认的问题。
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2 border-t border-line px-6 pb-6 pt-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmingId(null);
                  setConfirmationForm([]);
                }}
                className="flex-1 rounded-xl bg-surface-2 px-4 py-3 text-sm font-semibold text-ink-2"
              >
                稍后确认
              </button>
              <button
                type="button"
                onClick={saveCandidateConfirmation}
                disabled={savingConfirmation || !confirmationForm.some((item) => item.answer.trim())}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-btn disabled:opacity-60"
              >
                <Save size={15} />
                {savingConfirmation ? "保存中" : "保存确认"}
              </button>
            </div>
          </div>
        </div>
      )}

      {form && editingId && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/30">
          <div className="flex max-h-[76vh] w-full flex-col rounded-t-[32px] bg-white shadow-sheep">
            <div className="mx-auto mt-3 h-1 w-9 rounded bg-line" />
            <div className="flex items-center justify-between px-6 py-3">
              <div className="text-base font-black">编辑候选任务</div>
              <CloseButton
                onClick={() => {
                  setEditingId(null);
                  setForm(null);
                }}
                ariaLabel="关闭编辑"
                className="h-10 w-10 bg-transparent hover:bg-surface-2 active:bg-surface-2"
              />
            </div>
            <div className="safe-scroll px-6 pb-4">
              <Field label="任务标题">
                <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </Field>
              <Field label="截止时间">
                <input
                  className="input"
                  value={form.deadlineText}
                  onChange={(event) => setForm({ ...form, deadlineText: event.target.value })}
                  placeholder="例如：下周三前"
                />
              </Field>
              <Field label="优先级">
                <div className="grid grid-cols-3 gap-2">
                  {(["high", "medium", "low"] as const).map((priority) => (
                    <button
                      key={priority}
                      type="button"
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
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(null);
                }}
                className="flex-1 rounded-xl bg-surface-2 px-4 py-3 text-sm font-semibold text-ink-2"
              >
                取消
              </button>
              <button
                type="button"
                onClick={saveCandidateEdit}
                disabled={savingEdit}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-btn disabled:opacity-60"
              >
                <Save size={15} />
                {savingEdit ? "保存中" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ResultBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-[18px] shadow-card">
      <h2 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[1px] text-brand">
        <Info size={13} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function CandidateTaskCard({
  candidate,
  selected,
  busy,
  onSelect,
  onEdit,
  onConfirm,
  onAdd,
  onOpenTask
}: {
  candidate: CandidateTaskItem;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onConfirm: () => void;
  onAdd: () => void;
  onOpenTask: (taskId: string) => void;
}) {
  const added = candidate.candidateStatus === "added";
  const confirmed = !candidate.needConfirm && (candidate.confirmationAnswers?.some((item) => item.resolved) ?? false);
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-card transition ${added ? "border border-tag-green" : ""}`}>
      <div className="mb-2 flex items-start gap-3">
        <button
          type="button"
          onClick={onSelect}
          disabled={added}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
            added
              ? "border-tag-green bg-tag-green text-[#16A34A]"
              : selected
                ? "border-brand bg-brand text-white"
                : "border-line bg-white text-transparent"
          }`}
          aria-label={selected ? "取消选择候选任务" : "选择候选任务"}
        >
          <Check size={14} strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 flex-1 text-[16px] font-black leading-snug text-ink">{candidate.title}</h3>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                added ? "bg-tag-green text-[#16A34A]" : "bg-brand-light text-brand"
              }`}
            >
              {added ? "已加入" : "候选"}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-3 text-[13px] leading-6 text-ink-2">{candidate.description}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <TaskLabelList labels={candidate.labels} limit={2} />
        <PriorityBadge priority={candidate.priority} />
        <ConfirmationBadge task={candidate} />
        {confirmed && <Pill tone="light">已确认</Pill>}
        {candidate.deadlineText && <Pill tone="muted">{candidate.deadlineText}</Pill>}
      </div>
      <div className="mt-3 rounded-xl border-l-[3px] border-brand bg-brand-light/45 px-3 py-2 text-xs italic leading-5 text-ink-2">
        {candidate.sourceEvidence}
      </div>
      <div className="mt-3 flex gap-2">
        {added ? (
          <button
            type="button"
            onClick={() => candidate.addedTaskId && onOpenTask(candidate.addedTaskId)}
            disabled={!candidate.addedTaskId}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-xl bg-surface-2 px-3 text-xs font-bold text-ink-2 disabled:opacity-50"
          >
            查看已加入任务
            <ChevronRight size={14} />
          </button>
        ) : (
          <div className="grid w-full grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-line bg-white px-2 text-xs font-bold text-ink-2 transition active:bg-surface-2"
            >
              <Edit3 size={14} />
              编辑
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`inline-flex h-10 items-center justify-center rounded-xl px-2 text-xs font-bold transition active:scale-[0.99] ${
                candidate.needConfirm ? "bg-brand-light text-brand" : "bg-surface-2 text-ink-2"
              }`}
            >
              {candidate.needConfirm ? "确认信息" : "已确认"}
            </button>
            <button
              type="button"
              onClick={onAdd}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-brand px-2 text-xs font-bold text-white shadow-btn transition active:scale-[0.99] disabled:opacity-60"
            >
              <Plus size={14} />
              {busy ? "加入中" : "加入任务"}
            </button>
          </div>
        )}
      </div>
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

function List({ items, empty = "暂无" }: { items: string[]; empty?: string }) {
  if (!items.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="flex gap-2 text-sm leading-6">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function initialCandidateTasks(record: RecordItem): CandidateTaskItem[] {
  if (record.candidateTasks?.length) return record.candidateTasks;
  return record.tasks.map((task) => ({
    ...task,
    candidateStatus: "added",
    addedTaskId: task.id
  }));
}

function candidateToTaskPayload(candidate: CandidateTaskItem): Partial<CandidateTaskItem> {
  return {
    title: candidate.title,
    description: candidate.description,
    priority: candidate.priority,
    priorityReason: candidate.priorityReason,
    deadlineText: candidate.deadlineText,
    deadlineDate: candidate.deadlineDate,
    deliverable: candidate.deliverable,
    assignee: candidate.assignee,
    dependencies: candidate.dependencies,
    sourceEvidence: candidate.sourceEvidence,
    steps: candidate.steps,
    missingInfo: candidate.missingInfo,
    confirmQuestions: candidate.confirmQuestions,
    risk: candidate.risk,
    needConfirm: candidate.needConfirm,
    confirmationAnswers: candidate.confirmationAnswers,
    confidence: candidate.confidence,
    status: candidate.status,
    labels: candidate.labels
  };
}

function toConfirmationForm(candidate: CandidateTaskItem): ConfirmationFormItem[] {
  const existing = new Map((candidate.confirmationAnswers ?? []).map((item) => [item.question, item.answer]));
  return unique([...candidate.missingInfo, ...candidate.confirmQuestions]).map((question, index) => ({
    id: `confirm_${index}`,
    question,
    answer: existing.get(question) ?? ""
  }));
}

function toCandidateForm(candidate: CandidateTaskItem) {
  return {
    title: candidate.title,
    deadlineText: candidate.deadlineText ?? "",
    priority: candidate.priority,
    description: candidate.description,
    steps: candidate.steps.join("\n"),
    confirmQuestions: candidate.confirmQuestions.join("\n"),
    labels: candidate.labels ?? []
  };
}

function formToCandidatePatch(form: CandidateForm): Partial<CandidateTaskItem> {
  return {
    title: form.title.trim() || "未命名任务",
    deadlineText: form.deadlineText.trim() || undefined,
    priority: form.priority as Priority,
    description: form.description.trim(),
    steps: splitLines(form.steps),
    confirmQuestions: splitLines(form.confirmQuestions),
    labels: form.labels
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

function priorityWeight(priority: string) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}
