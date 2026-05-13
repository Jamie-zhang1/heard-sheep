"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { EmptyState, TaskCard } from "./ui";
import type { RecordItem, TaskItem } from "@/lib/types";

type Filter = "all" | "todo" | "confirm" | "done";
type PriorityFilter = "all" | TaskItem["priority"];

type TaskRow = TaskItem & {
  recordTitle: string;
  recordCreatedAt: string;
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
  const tasks = useMemo<TaskRow[]>(
    () =>
      records.flatMap((record) =>
        record.tasks.map((task) => ({
          ...task,
          recordTitle: record.title,
          recordCreatedAt: record.createdAt
        }))
      ),
    [records]
  );

  const pendingCount = tasks.filter((task) => task.status !== "done").length;
  const confirmCount = tasks.filter((task) => task.needConfirm).length;
  const doneCount = tasks.filter((task) => task.status === "done").length;

  const visibleTasks = tasks.filter((task) => {
    const statusMatched =
      filter === "all" ||
      (filter === "done" ? task.status === "done" : filter === "confirm" ? task.needConfirm : task.status !== "done");
    const priorityMatched = priorityFilter === "all" || task.priority === priorityFilter;
    return statusMatched && priorityMatched;
  });

  return (
    <>
      <header className="shrink-0 px-5 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink">任务</h1>
            <p className="mt-1 text-xs text-muted">
              {pendingCount} 项待处理 · {doneCount} 项已完成
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
              {item.key === "all" ? tasks.length : item.key === "done" ? doneCount : item.key === "confirm" ? confirmCount : pendingCount}
            </span>
          </button>
        ))}
      </div>
      {showFilters && (
        <div className="mx-5 mb-3 rounded-2xl bg-white p-3 shadow-card">
          <div className="mb-2 text-[11px] font-semibold text-muted">优先级</div>
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
        {visibleTasks.length ? (
          <div className="space-y-2">
            {visibleTasks.map((task) => (
              <div key={task.id}>
                <TaskCard task={task} href={`/task/${task.id}`} />
                <div className="px-1 pt-2 text-[11px] font-medium text-muted">来自：{task.recordTitle}</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="还没有任务，先录一段试试" description="生成任务计划后，待办会按状态出现在这里。" />
        )}
      </main>
    </>
  );
}
