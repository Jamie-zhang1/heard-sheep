"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { EmptyState, RecordRow } from "./ui";
import type { RecordItem } from "@/lib/types";

export function HistoryClient({ records, filter }: { records: RecordItem[]; filter?: string }) {
  const [query, setQuery] = useState("");
  const isRecordingFilter = filter === "recordings";

  const filteredRecords = useMemo(() => {
    const sourceFiltered = isRecordingFilter ? records.filter((record) => record.source === "recording") : records;
    const keyword = query.trim().toLowerCase();
    if (!keyword) return sourceFiltered;
    return sourceFiltered.filter((record) => {
      const haystack = [
        record.title,
        record.summary,
        record.transcriptText,
        record.rawText,
        ...record.tasks.map((task) => `${task.title} ${task.description} ${task.sourceEvidence}`)
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [isRecordingFilter, query, records]);

  const grouped = useMemo(() => groupByDay(filteredRecords), [filteredRecords]);
  const title = isRecordingFilter ? "全部录音记录" : "历史";

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
          <span className="inline-flex h-7 shrink-0 items-center justify-center rounded-full bg-surface-2 px-3 text-[11px] font-semibold text-muted">
            共 {filteredRecords.length} 条
          </span>
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
        {filteredRecords.length ? (
          Object.entries(grouped).map(([day, items]) => (
            <section key={day}>
              <div className="flex items-center gap-2 px-1 py-2">
                <h2 className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted">{day}</h2>
                <span className="h-px flex-1 bg-line" />
                <span className="text-[10px] font-semibold text-muted">{items.length} 条</span>
              </div>
              {items.map((record) => (
                <RecordRow key={record.id} record={record} href={`/result/${record.id}`} />
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
