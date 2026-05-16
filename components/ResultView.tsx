"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, ClipboardList, Info, Route, Text } from "lucide-react";
import { ConfirmationBadge, Pill, PriorityBadge, StatusBadge, TaskLabelList, confirmationIssueCount } from "./ui";
import { formatDateTime, formatDuration } from "@/lib/format";
import { apiPath } from "@/lib/api-path";
import type { RecordItem, TaskItem } from "@/lib/types";

type Tab = "text" | "tasks" | "plan";

const tabs: Array<{ key: Tab; label: string; icon: typeof Text }> = [
  { key: "text", label: "整理文本", icon: Text },
  { key: "tasks", label: "任务提取", icon: ClipboardList },
  { key: "plan", label: "执行方案", icon: Route }
];

export function ResultView({ record }: { record: RecordItem }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "tasks" ? "tasks" : searchParams.get("tab") === "plan" ? "plan" : "text";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [tasks, setTasks] = useState(record.tasks);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const orderedTasks = [...tasks].sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
  const showAiMeta =
    process.env.NODE_ENV !== "production" &&
    record.aiMeta &&
    (record.aiMeta.fallbackUsed || record.aiMeta.provider === "mock" || record.aiMeta.provider === "mock_fallback");

  async function toggleTaskDone(task: TaskItem) {
    if (updatingTaskId) return;
    const nextStatus = task.status === "done" ? "todo" : "done";
    setUpdatingTaskId(task.id);
    setTasks((items) => items.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item)));
    try {
      const response = await fetch(apiPath(`/api/tasks/${task.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!response.ok) throw new Error("update failed");
      router.refresh();
    } catch {
      setTasks((items) => items.map((item) => (item.id === task.id ? task : item)));
    } finally {
      setUpdatingTaskId(null);
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
          <p className="mt-0.5 text-[11px] text-muted">共提取 {tasks.length} 项任务</p>
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
        <span>{record.source === "recording" ? "录音" : record.source === "upload" ? "上传" : "粘贴稿"}</span>
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
                      <span className="text-brand">📍</span>
                      <span className="font-medium text-ink">{mark.label}</span>
                      <span className="text-muted">{Math.floor(mark.time / 60)}:{String(mark.time % 60).padStart(2, "0")}</span>
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
          <div className="space-y-2">
            {tasks.length ? (
              tasks.map((task) => (
                <div key={task.id} className="space-y-2">
                  <TaskTodoCard task={task} disabled={updatingTaskId === task.id} onToggle={() => toggleTaskDone(task)} />
                  <div className="rounded-2xl bg-white p-3 text-xs leading-5 text-ink-2 shadow-card">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <PriorityBadge priority={task.priority} />
                      <ConfirmationBadge task={task} />
                      {task.deadlineText && <Pill tone="light">{task.deadlineText}</Pill>}
                    </div>
                    <div className="rounded-xl border-l-[3px] border-brand bg-brand-light/45 px-3 py-2 italic">
                      {task.sourceEvidence}
                    </div>
                    <button onClick={() => router.push(task.needConfirm ? `/task/${task.id}#confirm` : `/task/${task.id}`)} className="mt-2 flex items-center gap-1 font-bold text-brand">
                      {task.needConfirm ? "查看待确认问题" : "查看依据与详情"} <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <ResultBlock title="未发现明确待办">
                <p className="text-sm leading-7 text-muted">可以返回修改文本，或在任务详情中手动添加任务。</p>
              </ResultBlock>
            )}
          </div>
        )}

        {tab === "plan" && (
          <div className="space-y-2">
            <ResultBlock title="推荐执行顺序">
              {orderedTasks.length ? (
                <div className="space-y-3">
                  {orderedTasks.map((task, index) => (
                    <div key={task.id} className="flex gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold leading-5">{task.title}</div>
                        <div className="mt-1 text-[11px] text-muted">{task.priorityReason || "按依赖和截止时间排序。"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">暂未生成执行顺序。</p>
              )}
            </ResultBlock>
            <ResultBlock title="缺失信息">
              <List items={unique(tasks.flatMap((task) => task.missingInfo))} empty="暂无缺失信息。" />
            </ResultBlock>
            <ResultBlock title="建议确认问题">
              <List items={unique([...record.globalConfirmQuestions, ...tasks.flatMap((task) => task.confirmQuestions)])} empty="暂无建议确认问题。" />
            </ResultBlock>
            <ResultBlock title="风险提示">
              <List
                items={unique([...record.warnings, ...(tasks.map((task) => task.risk).filter(Boolean) as string[])])}
                empty="暂无风险提示。"
              />
            </ResultBlock>
          </div>
        )}
      </main>
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

function TaskTodoCard({ task, disabled, onToggle }: { task: TaskItem; disabled: boolean; onToggle: () => void }) {
  const done = task.status === "done";
  const confirmCount = confirmationIssueCount(task);
  const taskHref = `/sheep/task/${task.id}`;
  const confirmHref = `${taskHref}#confirm`;
  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-card transition ${
        done ? "opacity-70" : ""
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            window.location.href = taskHref;
          }}
          className="min-w-0 flex-1 text-left"
        >
          <h3 className={`min-w-0 text-[16px] font-black leading-snug text-ink ${done ? "line-through decoration-2 opacity-70" : ""}`}>
            {task.title}
          </h3>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            className={`inline-flex !h-7 !min-h-7 !w-7 !min-w-7 items-center justify-center rounded-full border p-0 transition active:scale-95 ${
              done
                ? "border-brand bg-brand text-white shadow-btn"
                : "border-line bg-white text-transparent hover:border-brand hover:bg-brand-light"
            } ${disabled ? "cursor-wait opacity-60" : "cursor-pointer"}`}
            aria-label={done ? "标记为待处理" : "标记为已完成"}
          >
            <Check size={15} strokeWidth={3} />
          </button>
          <StatusBadge status={task.status} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          window.location.href = taskHref;
        }}
        className="block w-full text-left"
      >
        <p className={`line-clamp-2 text-[13px] leading-6 text-ink-2 ${done ? "line-through opacity-65" : ""}`}>{task.description}</p>
      </button>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <TaskLabelList labels={task.labels} limit={1} />
        <PriorityBadge priority={task.priority} />
        {task.needConfirm && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              window.location.href = confirmHref;
            }}
            className="inline-flex !h-7 !min-h-7 !min-w-0 items-center justify-center gap-0.5 whitespace-nowrap rounded-full bg-tag-blue px-2.5 text-[11px] font-semibold leading-none text-[#1D6FB8] transition active:scale-[0.98] active:bg-brand-light"
            aria-label="查看待确认问题"
          >
            去确认{confirmCount ? ` ${confirmCount}项` : ""}
            <ChevronRight size={12} />
          </button>
        )}
        {task.deadlineText && <Pill tone="muted">{task.deadlineText}</Pill>}
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

function priorityWeight(priority: string) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}
