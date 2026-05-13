import type { SourceType, TaskLabel } from "./types";

export const TASK_LABELS: TaskLabel[] = [
  { id: "recording", name: "录音", type: "source" },
  { id: "upload", name: "上传", type: "source" },
  { id: "paste", name: "转写", type: "source" },
  { id: "meeting", name: "会议", type: "source" },
  { id: "wechat", name: "微信", type: "source" },
  { id: "note", name: "备忘", type: "source" },
  { id: "leader", name: "领导交代", type: "scenario" },
  { id: "review", name: "汇报反馈", type: "scenario" },
  { id: "project", name: "项目推进", type: "scenario" },
  { id: "client", name: "客户需求", type: "scenario" },
  { id: "data", name: "数据分析", type: "scenario" },
  { id: "urgent", name: "紧急", type: "scenario" },
  { id: "sheep_record", name: "听到咩", type: "system" },
  { id: "sheep_think", name: "想清咩", type: "system" },
  { id: "sheep_done", name: "完成咩", type: "system" },
  { id: "sheep_warn", name: "确认咩", type: "system" }
];

export const SOURCE_LABEL_MAP: Record<SourceType, string> = {
  recording: "recording",
  upload: "upload",
  paste: "paste",
  image: "paste"
};

export function getTaskLabel(id: string) {
  return TASK_LABELS.find((label) => label.id === id);
}

export function getTaskLabelName(id: string) {
  return getTaskLabel(id)?.name ?? id;
}

export function labelsByType(type: TaskLabel["type"]) {
  return TASK_LABELS.filter((label) => label.type === type);
}

export function inferTaskLabels(source: SourceType, text: string) {
  const normalized = text.toLowerCase();
  const labels = new Set<string>([SOURCE_LABEL_MAP[source], "sheep_record"]);

  if (/领导|老板|vp|汇报/.test(text)) labels.add("leader");
  if (/报告|数据|增长|留存|q2|分析/.test(normalized) || /数据|报告|增长|留存/.test(text)) labels.add("data");
  if (/会议|周会|同步|会后/.test(text)) labels.add("meeting");
  if (/微信|语音|聊天/.test(text)) labels.add("wechat");
  if (/汇报|反馈|修改意见|复盘/.test(text)) labels.add("review");
  if (/项目|推进|排期|进度/.test(text)) labels.add("project");
  if (/客户|商务|需求方/.test(text)) labels.add("client");
  if (/紧急|马上|今天|明天|下班前/.test(text)) labels.add("urgent");

  return Array.from(labels).slice(0, 5);
}

export function primaryLabelId(labels: string[] | undefined, fallbackSource: SourceType) {
  if (labels?.length) {
    const preferred = labels.find((label) => getTaskLabel(label)?.type === "scenario") ?? labels[0];
    return preferred;
  }
  return SOURCE_LABEL_MAP[fallbackSource];
}
