"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronRight, SlidersHorizontal } from "lucide-react";
import { EmptyState, LabelPill, Pill, PriorityBadge, StatusBadge } from "./ui";
import { formatDateTime } from "@/lib/format";
import { primaryLabelId } from "@/lib/labels";
import type { RecordItem, TaskItem, TaskStatus } from "@/lib/types";

type Filter = "all" | "todo" | "confirm" | "done";
type PriorityFilter = "all" | TaskItem["priority"];

type AnalysisRow = {
  record: RecordItem;
  total: number;
  done: number;
  pending: number;
  needConfirm: boolean;
  status: TaskStatus;
  topPriority: TaskItem["priority"];
};

const filters: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "todo", label: "待处理" },
  { key: "confirm", label: "需确认" },
  { key: "done", label: "已完成" }
];

const priorityFilters: Array<{ key: PriorityFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "high", label: "高" },
  { key: "medium", label: "中" },
  { key: "low", label: "低" }
];

export function TasksClient({ records }: { records: RecordItem[] }) {
  const searchParams = useSearchParams();
  const queryFilter = searchParams.get("filter");
  const initialFilter: Filter = queryFilter === "done" ? "done" : queryFilter === "confirm" ? "confirm" : queryFilter === "todo" ? "todo" : "all";
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const rows = useMemo<AnalysisRow[]>(
    () =>
      records
        .filter((record) => record.tasks.length > 0)
        .map((record) => {
          const total = record.tasks.length;
          const done = record.tasks.filter((task) => task.status === "done").length;
          const pending = total - done;
          const needConfirm = record.tasks.some((task) => task.needConfirm && task.status !== "done");
          const status: TaskStatus = pending === 0 ? "done" : record.tasks.some((task) => task.status === "doing") ? "doing" : "todo";
          const topPriority = [...record.tasks].sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority))[0]?.priority ?? "medium";
          return { record, total, done, pending, needConfirm, status, topPriority };
        }),
    [records]
  );

  const pendingRows = rows.filter((row) => row.pending > 0);
  const confirmRows = rows.filter((row) => row.needConfirm);
  const doneRows = rows.filter((row) => row.pending === 0);
  const pendingTaskCount = rows.reduce((sum, row) => sum + row.pending, 0);
  const doneTaskCount = rows.reduce((sum, row) => sum + row.done, 0);

  const visibleRows = rows.filter((row) => {
    const statusMatched =
      filter === "all" ||
      (filter === "done" ? row.pending === 0 : filter === "confirm" ? row.needConfirm : row.pending > 0);
    const priorityMatched = priorityFilter === "all" || row.topPriority === priorityFilter;
    return statusMatched && priorityMatched;
  });

  return (
    <>
      <header className="shrink-0 px-5 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink">任务</h1>
            <p className="mt-1 text-xs text-muted">
              {pendingRows.length} 个待处理任务 · {pendingTaskCount} 条待办
            </p>
          </div>
          <button
            onClick={() => setShowFilters((value) => !value)}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition active:scale-[0.98] ${
              showFilters ? "bg-brand-light text-brand" : "bg-surface-2 text-ink-2"
            }`}
          >
            <SlidersHorizontal size={14} />
            筛选
          </button>
        </div>
      </header>

      <div className="mx-5 mb-3 flex shrink-0 rounded-2xl bg-surface-2 p-1">
        {filters.map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition ${
              filter === item.key ? "bg-white text-ink shadow-card" : "text-muted"
            }`}
          >
            {item.label}
            <span className="ml-1 text-[10px] opacity-70">
              {item.key === "all" ? rows.length : item.key === "done" ? doneRows.length : item.key === "confirm" ? confirmRows.length : pendingRows.length}
            </span>
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="mx-5 mb-3 rounded-2xl bg-white p-3 shadow-card">
          <div className="mb-2 text-[11px] font-semibold text-muted">最高优先级</div>
          <div className="flex gap-2">
            {priorityFilters.map((item) => (
              <button
                key={item.key}
                onClick={() => setPriorityFilter(item.key)}
                className={`inline-flex h-8 flex-1 items-center justify-center rounded-full text-xs font-semibold transition active:scale-[0.98] ${
                  priorityFilter === item.key ? "bg-brand text-white shadow-btn" : "bg-surface-2 text-muted"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="safe-scroll px-5 py-1">
        {visibleRows.length ? (
          <div className="space-y-3">
            {visibleRows.map((row) => (
              <AnalysisTaskCard key={row.record.id} row={row} />
            ))}
          </div>
        ) : (
          <EmptyState title="还没有任务，先录一段试试" description="生成任务计划后，每次分析会作为一个任务出现在这里。" />
        )}
      </main>
    </>
  );
}

function AnalysisTaskCard({ row }: { row: AnalysisRow }) {
  const { record, total, done, pending, needConfirm, status, topPriority } = row;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const firstTask = record.tasks[0];
  const labelId = primaryLabelId(firstTask?.labels, record.source);

  return (
    <Link
      href={`/result/${record.id}?tab=tasks`}
      className="block rounded-2xl bg-white p-4 shadow-card transition hover:brightness-[0.98] active:scale-[0.99] active:bg-surface-2"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-[16px] font-black leading-snug text-ink">{record.title}</h3>
        <StatusBadge status={status} />
      </div>
      <p className="line-clamp-2 text-[13px] leading-6 text-ink-2">{record.summary}</p>

      <div className="mt-3 flex items-center gap-2">
        <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
          <span className="block h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </span>
        <span className="shrink-0 text-[11px] font-bold text-muted">
          {done}/{total}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <LabelPill id={labelId} />
        <PriorityBadge priority={topPriority} />
        {needConfirm && <Pill tone="light">需确认</Pill>}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-[11px] font-semibold text-muted">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <CheckCircle2 size={13} className="shrink-0 text-brand" />
          <span className="truncate">{pending} 条待处理 · {formatDateTime(record.createdAt)}</span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-neutral-400" />
      </div>
    </Link>
  );
}

function priorityWeight(priority: TaskItem["priority"]) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}
