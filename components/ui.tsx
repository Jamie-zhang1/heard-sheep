import Link from "next/link";
import clsx from "clsx";
import { ChevronRight, Trash2, X } from "lucide-react";
import { formatDateTime, priorityLabel, statusLabel } from "@/lib/format";
import { getTaskLabel, getTaskLabelName, primaryLabelId } from "@/lib/labels";
import type { RecordItem, TaskItem } from "@/lib/types";
import { SheepVisual } from "./SheepVisual";

type PillTone = "dark" | "light" | "outline" | "muted";

export function CloseButton({
  onClick,
  ariaLabel = "关闭",
  className,
}: {
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={clsx(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 p-0 leading-none text-muted transition hover:bg-line/70 active:scale-95",
        className
      )}
    >
      <X size={18} strokeWidth={2.2} className="block" aria-hidden="true" />
    </button>
  );
}

export function DeleteConfirmSheet({
  title,
  description,
  confirmLabel = "确认删除",
  deleting = false,
  onCancel,
  onConfirm
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/30">
      <div className="w-full rounded-t-[32px] bg-white px-6 pb-6 pt-3 shadow-sheep">
        <div className="mx-auto mb-3 h-1 w-9 rounded bg-line" />
        <div className="mb-2 flex items-center justify-between">
          <div className="text-base font-black">{title}</div>
          <CloseButton
            onClick={onCancel}
            ariaLabel="关闭删除确认"
            className="h-10 w-10 bg-transparent hover:bg-surface-2 active:bg-surface-2"
          />
        </div>
        <div className="rounded-2xl border border-line bg-white p-3.5 text-[13px] leading-6 text-ink-2 shadow-card">
          {description}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-bold transition active:bg-surface-2 disabled:opacity-60"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex h-11 items-center justify-center gap-1 rounded-xl bg-ink px-4 text-sm font-bold text-white transition active:scale-[0.99] disabled:opacity-60"
          >
            <Trash2 size={15} />
            {deleting ? "删除中" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

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
      {isSystem && <SheepVisual variant={id === "sheep_done" ? "cheer" : id === "sheep_warn" ? "question" : "mascot"} size="xs" className="shrink-0" decorative motion="none" />}
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
  const meaningful = labels?.filter((label) => getTaskLabel(label)?.type !== "system") ?? [];
  const fallback = labels ?? [];
  const source = meaningful.length ? meaningful : fallback;
  const visible = limit ? source.slice(0, limit) : source;
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

export function confirmationIssueCount(task: Pick<TaskItem, "missingInfo" | "confirmQuestions" | "needConfirm">) {
  if (!task.needConfirm) return 0;
  return new Set([...task.missingInfo, ...task.confirmQuestions].filter(Boolean)).size;
}

export function ConfirmationBadge({ task }: { task: Pick<TaskItem, "missingInfo" | "confirmQuestions" | "needConfirm"> }) {
  if (!task.needConfirm) return null;
  const count = confirmationIssueCount(task);
  return (
    <Pill tone="light">
      待确认{count ? ` ${count}项` : ""}
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
          <TaskLabelList labels={task.labels} limit={2} />
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <PriorityBadge priority={task.priority} />
        {task.deadlineText && <Pill tone="muted">{task.deadlineText}</Pill>}
        <ConfirmationBadge task={task} />
      </div>
    </div>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}

export function RecordRow({
  record,
  href,
  showProgress = false,
  onDelete,
  deleteDisabled = false
}: {
  record: RecordItem;
  href: string;
  showProgress?: boolean;
  onDelete?: () => void;
  deleteDisabled?: boolean;
}) {
  const candidates = record.candidateTasks ?? [];
  const candidateCount = candidates.length;
  const confirmedCount = record.tasks.length;
  const done = record.tasks.filter((task) => task.status === "done").length;
  const progress = record.tasks.length ? Math.round((done / record.tasks.length) * 100) : 0;
  const labelId = primaryLabelId(record.tasks[0]?.labels ?? candidates[0]?.labels, record.source);
  return (
    <div className="mx-0 mb-3 flex items-center gap-2 rounded-2xl bg-white p-3 shadow-card transition hover:brightness-[0.98]">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 transition active:scale-[0.99]">
      <div className="flex w-[88px] shrink-0 items-center justify-center">
        <LabelPill id={labelId} compact />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold leading-5">{record.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-medium leading-4 text-muted [word-break:keep-all]">
          <span className="whitespace-nowrap">{candidateCount || confirmedCount} 条候选</span>
          <span className="shrink-0">·</span>
          <span className="whitespace-nowrap">{confirmedCount} 条已加入</span>
          <span className="shrink-0">·</span>
          <span className="whitespace-nowrap">{formatDateTime(record.createdAt)}</span>
        </div>
        {showProgress && confirmedCount > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
            </span>
            <span className="shrink-0 text-[10px] font-semibold text-muted">
              {done}/{confirmedCount}
            </span>
          </div>
        )}
        {showProgress && confirmedCount === 0 && candidateCount > 0 && (
          <div className="mt-2 text-[10px] font-semibold text-brand">等待确认加入任务清单</div>
        )}
      </div>
        <ChevronRight size={18} className="shrink-0 text-neutral-400" />
      </Link>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleteDisabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted transition active:scale-95 active:bg-line disabled:opacity-50"
          aria-label="删除记录"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-6 my-8 rounded-2xl border border-dashed border-line bg-white p-6 text-center shadow-card">
      <SheepVisual variant="empty" size="md" className="mx-auto mb-3 opacity-95" motion="soft" />
      <div className="text-sm font-bold">{title}</div>
      <p className="mt-2 text-xs leading-5 text-muted">{description}</p>
    </div>
  );
}
