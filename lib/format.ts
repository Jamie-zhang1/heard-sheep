export function formatDateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatDuration(seconds?: number) {
  if (!seconds) return "无时长";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  if (!minutes) return `${rest}秒`;
  return `${minutes}分${String(rest).padStart(2, "0")}秒`;
}

export function formatBytes(bytes?: number) {
  if (!bytes) return "0 KB";
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function priorityLabel(priority: string) {
  if (priority === "high") return "高";
  if (priority === "medium") return "中";
  return "低";
}

export function statusLabel(status: string) {
  if (status === "done") return "已完成";
  if (status === "doing") return "进行中";
  return "待处理";
}

