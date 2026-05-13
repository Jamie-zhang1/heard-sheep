import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  AnalyzeResult,
  RecordCreateInput,
  RecordItem,
  TaskItem,
  TaskStatus,
  TaskWithRecord
} from "./types";
import { inferTaskLabels } from "./labels";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "records.json");

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, "[]", "utf8");
  }
}

export async function readRecords(): Promise<RecordItem[]> {
  await ensureDataFile();
  const content = await fs.readFile(dataFile, "utf8");
  if (!content.trim()) return [];
  return JSON.parse(content) as RecordItem[];
}

export async function writeRecords(records: RecordItem[]) {
  await ensureDataFile();
  await fs.writeFile(dataFile, JSON.stringify(records, null, 2), "utf8");
}

export async function listRecords() {
  const records = await readRecords();
  return records.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

export async function getRecord(id: string) {
  const records = await readRecords();
  return records.find((record) => record.id === id) ?? null;
}

export async function createRecord(input: RecordCreateInput) {
  const now = new Date().toISOString();
  const recordId = `record_${randomUUID()}`;
  const record: RecordItem = {
    id: recordId,
    title: input.analysis.title,
    source: input.source,
    rawText: input.rawText,
    transcriptText: input.transcriptText,
    summary: input.analysis.summary,
    audioName: input.audioName,
    audioDuration: input.audioDuration,
    organizedText: toOrganizedText(input.analysis),
    globalConfirmQuestions: input.analysis.global_confirm_questions,
    warnings: input.analysis.warnings,
    aiMeta: input.analysis.meta,
    marks: input.marks,
    tasks: input.analysis.tasks.map((task, index) => ({
      id: `task_${randomUUID()}`,
      recordId,
      title: task.title || `待办 ${index + 1}`,
      description: task.description,
      priority: task.priority,
      priorityReason: task.priority_reason,
      deadlineText: task.deadline_text,
      deadlineDate: task.deadline_date,
      deliverable: task.deliverable,
      assignee: task.assignee,
      dependencies: task.dependencies,
      sourceEvidence: task.source_evidence,
      steps: task.steps,
      missingInfo: task.missing_info,
      confirmQuestions: task.confirm_questions,
      risk: task.risk,
      needConfirm: task.need_confirm,
      confidence: task.confidence,
      status: task.status,
      labels: task.labels?.length
        ? task.labels
        : inferTaskLabels(input.source, `${task.title} ${task.description} ${input.transcriptText}`)
    })),
    createdAt: now,
    updatedAt: now
  };
  const records = await readRecords();
  records.unshift(record);
  await writeRecords(records);
  return record;
}

export async function updateRecord(id: string, patch: Partial<RecordItem>) {
  const records = await readRecords();
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) return null;
  records[index] = {
    ...records[index],
    ...patch,
    id,
    updatedAt: new Date().toISOString()
  };
  await writeRecords(records);
  return records[index];
}

export async function deleteRecord(id: string) {
  const records = await readRecords();
  const next = records.filter((record) => record.id !== id);
  await writeRecords(next);
  return records.length !== next.length;
}

export async function getTask(taskId: string): Promise<TaskWithRecord | null> {
  const records = await readRecords();
  for (const record of records) {
    const task = record.tasks.find((item) => item.id === taskId);
    if (task) return { task, record };
  }
  return null;
}

export async function updateTask(taskId: string, patch: Partial<TaskItem>) {
  const records = await readRecords();
  for (const record of records) {
    const index = record.tasks.findIndex((task) => task.id === taskId);
    if (index !== -1) {
      record.tasks[index] = {
        ...record.tasks[index],
        ...patch,
        id: taskId,
        recordId: record.id
      };
      record.updatedAt = new Date().toISOString();
      await writeRecords(records);
      return { task: record.tasks[index], record };
    }
  }
  return null;
}

export async function addTask(recordId: string, input: Partial<TaskItem>) {
  const records = await readRecords();
  const record = records.find((item) => item.id === recordId);
  if (!record) return null;
  const task: TaskItem = {
    id: `task_${randomUUID()}`,
    recordId,
    title: input.title || "手动添加任务",
    description: input.description || "",
    priority: input.priority || "medium",
    priorityReason: input.priorityReason,
    deadlineText: input.deadlineText,
    deadlineDate: input.deadlineDate ?? null,
    deliverable: input.deliverable,
    assignee: input.assignee,
    dependencies: input.dependencies ?? [],
    sourceEvidence: input.sourceEvidence || "用户手动添加，暂无原文依据。",
    steps: input.steps ?? [],
    missingInfo: input.missingInfo ?? [],
    confirmQuestions: input.confirmQuestions ?? [],
    risk: input.risk,
    needConfirm: input.needConfirm ?? false,
    confidence: input.confidence || "medium",
    status: (input.status as TaskStatus) || "todo",
    labels: input.labels?.length ? input.labels : inferTaskLabels(record.source, `${input.title ?? ""} ${input.description ?? ""}`)
  };
  record.tasks.push(task);
  record.updatedAt = new Date().toISOString();
  await writeRecords(records);
  return { task, record };
}

export async function deleteTask(taskId: string) {
  const records = await readRecords();
  for (const record of records) {
    const length = record.tasks.length;
    record.tasks = record.tasks.filter((task) => task.id !== taskId);
    if (record.tasks.length !== length) {
      record.updatedAt = new Date().toISOString();
      await writeRecords(records);
      return true;
    }
  }
  return false;
}

function toOrganizedText(analysis: AnalyzeResult) {
  return {
    cleanedText: analysis.organized_text.cleaned_text,
    keyPoints: analysis.organized_text.key_points,
    timeMentions: analysis.organized_text.time_mentions,
    specialRequirements: analysis.organized_text.special_requirements
  };
}
