import Link from "next/link";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { formatDateTime, priorityLabel, statusLabel } from "@/lib/format";
import { getTaskLabel, getTaskLabelName, primaryLabelId } from "@/lib/labels";
import type { RecordItem, TaskItem } from "@/lib/types";
import { SheepIcon } from "./SheepIcon";

type PillTone = "dark" | "light" | "outline" | "muted";

export function Pill({
  children,
  tone = "outline",
  className
}: {
  children: React.ReactNode;
  tone?: PillTone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex h-6 items-center justify-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-semibold leading-none tracking-[0.01em]",
        tone === "dark" && "bg-brand-light text-brand",
        tone === "light" && "bg-tag-blue text-[#1D6FB8]",
        tone === "outline" && "bg-surface-2 text-ink-2",
        tone === "muted" && "bg-surface-2 text-muted",
        className
      )}
    >
      {children}
    </span>
  );
}

export function LabelPill({
  id,
  selected = false,
  compact = false,
  onClick
}: {
  id: string;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
}) {
  const label = getTaskLabel(id);
  const isSystem = label?.type === "system";
  const isScenario = label?.type === "scenario";

  const content = (
    <>
      {isSystem && <SheepIcon variant={id === "sheep_done" ? "sleepy" : "tiny"} className="h-4 w-4 shrink-0" />}
      <span>{getTaskLabelName(id)}</span>
    </>
  );

  const className = clsx(
    "inline-flex h-6 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-center text-[11px] font-semibold leading-none tracking-[0.01em] transition",
    compact && "h-7 min-w-[72px] px-2.5 text-[11px]",
    selected
      ? "bg-brand text-white shadow-btn"
      : isScenario
        ? "bg-brand-light text-brand"
        : "bg-surface-2 text-ink-2",
    onClick && "cursor-pointer active:scale-[0.98] hover:brightness-95"
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <span className={className}>{content}</span>;
}

export function TaskLabelList({ labels, limit }: { labels?: string[]; limit?: number }) {
  const visible = limit ? labels?.slice(0, limit) : labels;
  if (!visible?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((label) => (
        <LabelPill key={label} id={label} />
      ))}
    </div>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-black uppercase tracking-[1px]">{title}</h2>
      {action}
    </div>
  );
}

export function PriorityBadge({ priority }: { priority: TaskItem["priority"] }) {
  const tone =
    priority === "high"
      ? "bg-tag-red text-[#DC2626]"
      : priority === "medium"
        ? "bg-tag-amber text-[#D97706]"
        : "bg-tag-green text-[#16A34A]";
  return (
    <Pill tone="outline" className={tone}>
      {priorityLabel(priority)}优先级
    </Pill>
  );
}

export function StatusBadge({ status }: { status: TaskItem["status"] }) {
  const tone =
    status === "done"
      ? "bg-tag-green text-[#16A34A]"
      : status === "doing"
        ? "bg-brand-light text-brand"
        : "bg-tag-amber text-[#B45309]";
  return (
    <Pill tone="outline" className={tone}>
      {statusLabel(status)}
    </Pill>
  );
}

export function TaskCard({ task, href }: { task: TaskItem; href?: string }) {
  const content = (
    <div className="rounded-2xl bg-white p-4 shadow-card transition active:scale-[0.99] active:bg-surface-2">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">{task.title}</h3>
        <StatusBadge status={task.status} />
      </div>
      <p className="line-clamp-2 text-xs leading-5 text-ink-2">{task.description}</p>
      {(task.labels?.length ?? 0) > 0 && (
        <div className="mt-3">
          <TaskLabelList labels={task.labels} limit={3} />
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <PriorityBadge priority={task.priority} />
        {task.deadlineText && <Pill tone="muted">{task.deadlineText}</Pill>}
        {task.needConfirm && <Pill tone="light">需确认</Pill>}
      </div>
    </div>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}

export function RecordRow({ record, href, showProgress = false }: { record: RecordItem; href: string; showProgress?: boolean }) {
  const undone = record.tasks.filter((task) => task.status !== "done").length;
  const done = record.tasks.length - undone;
  const progress = record.tasks.length ? Math.round((done / record.tasks.length) * 100) : 0;
  const labelId = primaryLabelId(record.tasks[0]?.labels, record.source);
  return (
    <Link href={href} className="mx-0 mb-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card transition hover:brightness-[0.98] active:scale-[0.99]">
      <div className="flex w-[88px] shrink-0 items-center justify-center">
        <LabelPill id={labelId} compact />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold leading-5">{record.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-medium leading-4 text-muted [word-break:keep-all]">
          <span className="whitespace-nowrap">{record.tasks.length} 条待办</span>
          <span className="shrink-0">·</span>
          <span className="whitespace-nowrap">{undone} 条待处理</span>
          <span className="shrink-0">·</span>
          <span className="whitespace-nowrap">{formatDateTime(record.createdAt)}</span>
        </div>
        {showProgress && (
          <div className="mt-2 flex items-center gap-2">
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
            </span>
            <span className="shrink-0 text-[10px] font-semibold text-muted">
              {done}/{record.tasks.length}
            </span>
          </div>
        )}
      </div>
      <ChevronRight size={18} className="text-neutral-400" />
    </Link>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-6 my-8 rounded-2xl border border-dashed border-line bg-white p-6 text-center shadow-card">
      <SheepIcon variant="sleepy" className="mx-auto mb-3 h-20 w-20 opacity-95" />
      <div className="text-sm font-bold">{title}</div>
      <p className="mt-2 text-xs leading-5 text-muted">{description}</p>
    </div>
  );
}
