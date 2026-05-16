"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, CheckCircle2, ChevronRight, SlidersHorizontal } from "lucide-react";
import { ConfirmationBadge, DeleteConfirmSheet, EmptyState, LabelPill, PriorityBadge, SelectionToolbar, StatusBadge } from "./ui";
import { apiPath } from "@/lib/api-path";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFilter = searchParams.get("filter");
  const initialFilter: Filter = queryFilter === "done" ? "done" : queryFilter === "confirm" ? "confirm" : queryFilter === "todo" ? "todo" : "all";
  const [items, setItems] = useState(records);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setItems(records);
  }, [records]);

  const rows = useMemo<AnalysisRow[]>(
    () =>
      items
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
    [items]
  );

  const pendingRows = rows.filter((row) => row.pending > 0);
  const confirmRows = rows.filter((row) => row.needConfirm);
  const doneRows = rows.filter((row) => row.pending === 0);
  const pendingTaskCount = rows.reduce((sum, row) => sum + row.pending, 0);

  const visibleRows = rows.filter((row) => {
    const statusMatched =
      filter === "all" ||
      (filter === "done" ? row.pending === 0 : filter === "confirm" ? row.needConfirm : row.pending > 0);
    const priorityMatched = priorityFilter === "all" || row.topPriority === priorityFilter;
    return statusMatched && priorityMatched;
  });
  const selectedVisibleIds = selectedRecordIds.filter((id) => visibleRows.some((row) => row.record.id === id));
  const allVisibleSelected = visibleRows.length > 0 && selectedVisibleIds.length === visibleRows.length;

  function toggleSelectedRecord(id: string) {
    setSelectedRecordIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAllVisible() {
    setSelectedRecordIds(allVisibleSelected ? [] : visibleRows.map((row) => row.record.id));
  }

  async function deleteSelectedTaskGroups() {
    if (!selectedVisibleIds.length) return;
    setDeleting(true);
    try {
      const updatedRecords: RecordItem[] = [];
      for (const id of selectedVisibleIds) {
        const response = await fetch(apiPath(`/api/records/${id}/tasks`), { method: "DELETE" });
        if (response.ok) {
          const data = (await response.json()) as { record: RecordItem };
          updatedRecords.push(data.record);
        }
      }
      setItems((current) =>
        current.map((record) => updatedRecords.find((updated) => updated.id === record.id) ?? record)
      );
      setSelectedRecordIds([]);
      setSelectionMode(false);
      setDeleteOpen(false);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <header className="shrink-0 px-5 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink">任务</h1>
            <p className="mt-1 text-xs text-muted">
              {pendingRows.length} 组待处理任务 · {pendingTaskCount} 条待办
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => {
                setSelectionMode((value) => !value);
                setSelectedRecordIds([]);
              }}
              disabled={!visibleRows.length}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-light px-3 text-xs font-bold text-brand transition active:scale-[0.98] disabled:opacity-50"
            >
              {selectionMode ? "完成" : "管理"}
            </button>
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
        {selectionMode && visibleRows.length > 0 && (
          <SelectionToolbar
            selectedCount={selectedVisibleIds.length}
            allSelected={allVisibleSelected}
            deleting={deleting}
            deleteLabel="移出所选"
            onToggleAll={toggleAllVisible}
            onDelete={() => setDeleteOpen(true)}
          />
        )}
        {visibleRows.length ? (
          <div className="space-y-3">
            {visibleRows.map((row) => (
              <AnalysisTaskCard
                key={row.record.id}
                row={row}
                selectionMode={selectionMode}
                selected={selectedRecordIds.includes(row.record.id)}
                onSelect={() => toggleSelectedRecord(row.record.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="还没有任务，先录一段试试" description="生成任务计划并确认加入后，任务会出现在这里。" />
        )}
      </main>

      {deleteOpen && (
        <DeleteConfirmSheet
          title="移出所选任务"
          description={`会移出 ${selectedVisibleIds.length} 组已加入任务；历史记录和 AI 候选任务仍会保留，可回到结果页重新加入。`}
          deleting={deleting}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={deleteSelectedTaskGroups}
        />
      )}
    </>
  );
}

function AnalysisTaskCard({
  row,
  selectionMode,
  selected,
  onSelect
}: {
  row: AnalysisRow;
  selectionMode: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const { record, total, done, pending, needConfirm, status, topPriority } = row;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const firstTask = record.tasks[0];
  const labelId = primaryLabelId(firstTask?.labels, record.source);
  const href = `/result/${record.id}?tab=tasks`;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card transition hover:brightness-[0.98]">
      <div className="mb-2 flex items-start gap-3">
        {selectionMode && (
          <button
            type="button"
            onClick={onSelect}
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
              selected ? "border-brand bg-brand text-white" : "border-line bg-white text-transparent"
            }`}
            aria-label={selected ? "取消选择任务" : "选择任务"}
          >
            <Check size={15} strokeWidth={3} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <Link href={href} className="block active:scale-[0.99]">
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 flex-1 text-[16px] font-black leading-snug text-ink">{record.title}</h3>
              <StatusBadge status={status} />
            </div>
          </Link>
        </div>
      </div>
      <Link href={href} className="block active:scale-[0.99]">
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
          {needConfirm && <ConfirmationBadge task={firstTask} />}
        </div>
      </Link>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-[11px] font-semibold text-muted">
        <Link href={href} className="inline-flex min-w-0 flex-1 items-center gap-1.5">
          <CheckCircle2 size={13} className="shrink-0 text-brand" />
          <span className="truncate">{pending} 条待处理 · {formatDateTime(record.createdAt)}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={href} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-neutral-400">
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function priorityWeight(priority: TaskItem["priority"]) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}
