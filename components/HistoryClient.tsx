"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { DeleteConfirmSheet, EmptyState, RecordRow, SelectionToolbar } from "./ui";
import { apiPath } from "@/lib/api-path";
import type { RecordItem } from "@/lib/types";

export function HistoryClient({ records, filter }: { records: RecordItem[]; filter?: string }) {
  const router = useRouter();
  const [items, setItems] = useState(records);
  const [query, setQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isRecordingFilter = filter === "recordings";

  useEffect(() => {
    setItems(records);
  }, [records]);

  const filteredRecords = useMemo(() => {
    const sourceFiltered = isRecordingFilter ? items.filter((record) => record.source === "recording") : items;
    const keyword = query.trim().toLowerCase();
    if (!keyword) return sourceFiltered;
    return sourceFiltered.filter((record) => {
      const haystack = [
        record.title,
        record.summary,
        record.transcriptText,
        record.rawText,
        ...(record.candidateTasks ?? []).map((task) => `${task.title} ${task.description} ${task.sourceEvidence}`),
        ...record.tasks.map((task) => `${task.title} ${task.description} ${task.sourceEvidence}`)
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [isRecordingFilter, items, query]);

  const grouped = useMemo(() => groupByDay(filteredRecords), [filteredRecords]);
  const title = isRecordingFilter ? "全部录音记录" : "历史";
  const selectedVisibleIds = selectedIds.filter((id) => filteredRecords.some((record) => record.id === id));
  const allVisibleSelected = filteredRecords.length > 0 && selectedVisibleIds.length === filteredRecords.length;

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAllVisible() {
    setSelectedIds(allVisibleSelected ? [] : filteredRecords.map((record) => record.id));
  }

  async function deleteSelectedHistoryRecords() {
    if (!selectedVisibleIds.length) return;
    setDeleting(true);
    try {
      for (const id of selectedVisibleIds) {
        await fetch(apiPath(`/api/records/${id}`), { method: "DELETE" });
      }
      setItems((current) => current.filter((record) => !selectedVisibleIds.includes(record.id)));
      setSelectedIds([]);
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink">{title}</h1>
            <p className="mt-1 text-xs text-muted">
              {isRecordingFilter ? "来自现场录音的分析记录" : "按时间回看录音、转写和分析结果"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex h-7 items-center justify-center rounded-full bg-surface-2 px-3 text-[11px] font-semibold text-muted">
              共 {filteredRecords.length} 条
            </span>
            {filteredRecords.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectionMode((value) => !value);
                  setSelectedIds([]);
                }}
                className="inline-flex h-7 items-center justify-center rounded-full bg-brand-light px-3 text-[11px] font-bold text-brand"
              >
                {selectionMode ? "完成" : "管理"}
              </button>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-2.5 rounded-2xl border bg-white px-4 py-3 shadow-card transition ${query ? "border-brand" : "border-line"}`}>
          <Search size={16} className="shrink-0 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索历史记录..."
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
          <button
            onClick={() => setQuery("")}
            className={`flex !h-5 !min-h-5 !w-5 !min-w-5 items-center justify-center rounded-full bg-surface-2 p-0 text-muted transition ${
              query ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-label="清空搜索"
          >
            <X size={11} />
          </button>
        </div>
      </header>

      <main className="safe-scroll px-5 py-1">
        {selectionMode && filteredRecords.length > 0 && (
          <SelectionToolbar
            selectedCount={selectedVisibleIds.length}
            allSelected={allVisibleSelected}
            deleting={deleting}
            onToggleAll={toggleAllVisible}
            onDelete={() => setDeleteOpen(true)}
          />
        )}
        {filteredRecords.length ? (
          Object.entries(grouped).map(([day, dayItems]) => (
            <section key={day}>
              <div className="flex items-center gap-2 px-1 py-2">
                <h2 className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted">{day}</h2>
                <span className="h-px flex-1 bg-line" />
                <span className="text-[10px] font-semibold text-muted">{dayItems.length} 条</span>
              </div>
              {dayItems.map((record) => (
                <RecordRow
                  key={record.id}
                  record={record}
                  href={`/result/${record.id}`}
                  selectionMode={selectionMode}
                  selected={selectedIds.includes(record.id)}
                  onSelect={() => toggleSelected(record.id)}
                />
              ))}
            </section>
          ))
        ) : (
          <EmptyState
            title={query ? "没有找到相关记录" : "这里会保存你听到的重要交代"}
            description={query ? "换个关键词试试，或清空搜索查看全部历史。" : "完成一次录音或粘贴稿分析后，这里会保存结果。"}
          />
        )}
      </main>

      {deleteOpen && (
        <DeleteConfirmSheet
          title="删除所选历史"
          description={`会删除 ${selectedVisibleIds.length} 条分析记录、候选任务和已加入任务。删除后无法在历史页继续回看。`}
          deleting={deleting}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={deleteSelectedHistoryRecords}
        />
      )}
    </>
  );
}

function groupByDay<T extends { createdAt: string }>(records: T[]) {
  return records.reduce<Record<string, T[]>>((groups, record) => {
    const day = new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "short"
    }).format(new Date(record.createdAt));
    groups[day] ||= [];
    groups[day].push(record);
    return groups;
  }, {});
}
