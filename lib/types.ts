export type SourceType = "recording" | "upload" | "paste" | "image";
export type Priority = "high" | "medium" | "low";
export type Confidence = "high" | "medium" | "low";
export type TaskStatus = "todo" | "doing" | "done";
export type CandidateTaskStatus = "candidate" | "added";
export type TaskLabelType = "source" | "scenario" | "system";

export type TaskLabel = {
  id: string;
  name: string;
  type: TaskLabelType;
};

export type ConfirmationAnswer = {
  id: string;
  question: string;
  answer: string;
  resolved: boolean;
  updatedAt?: string;
};

export type AnalyzeMeta = {
  provider: "deepseek" | "mimo" | "mock" | "mock_fallback";
  model?: string;
  fallbackUsed: boolean;
  error?: string;
};

export type OrganizedText = {
  cleanedText: string;
  keyPoints: string[];
  timeMentions: string[];
  specialRequirements: string[];
};

export type AnalyzeOrganizedText = {
  cleaned_text: string;
  key_points: string[];
  time_mentions: string[];
  special_requirements: string[];
};

export type AnalyzeTask = {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  priority_reason: string;
  deadline_text?: string;
  deadline_date: string | null;
  deliverable?: string;
  assignee?: string;
  dependencies: string[];
  steps: string[];
  missing_info: string[];
  confirm_questions: string[];
  risk?: string;
  source_evidence: string;
  confidence: Confidence;
  need_confirm: boolean;
  status: TaskStatus;
  labels?: string[];
};

export type AnalyzeResult = {
  title: string;
  summary: string;
  organized_text: AnalyzeOrganizedText;
  tasks: AnalyzeTask[];
  global_confirm_questions: string[];
  warnings: string[];
  meta?: AnalyzeMeta;
};

export type TaskItem = {
  id: string;
  recordId: string;
  title: string;
  description: string;
  priority: Priority;
  priorityReason?: string;
  deadlineText?: string;
  deadlineDate?: string | null;
  deliverable?: string;
  assignee?: string;
  dependencies?: string[];
  sourceEvidence: string;
  steps: string[];
  missingInfo: string[];
  confirmQuestions: string[];
  risk?: string;
  needConfirm: boolean;
  confirmationAnswers?: ConfirmationAnswer[];
  confidence: Confidence;
  status: TaskStatus;
  labels: string[];
};

export type CandidateTaskItem = Omit<TaskItem, "id"> & {
  id: string;
  candidateStatus: CandidateTaskStatus;
  addedTaskId?: string;
  addedAt?: string;
};

export type RecordItem = {
  id: string;
  title: string;
  source: SourceType;
  rawText: string;
  transcriptText: string;
  summary: string;
  audioName?: string;
  audioDuration?: number;
  organizedText: OrganizedText;
  globalConfirmQuestions: string[];
  warnings: string[];
  aiMeta?: AnalyzeMeta;
  candidateTasks?: CandidateTaskItem[];
  tasks: TaskItem[];
  marks?: Mark[];
  createdAt: string;
  updatedAt: string;
};

export type TaskWithRecord = {
  task: TaskItem;
  record: RecordItem;
};

export type RecordCreateInput = {
  source: SourceType;
  rawText: string;
  transcriptText: string;
  analysis: AnalyzeResult;
  audioName?: string;
  audioDuration?: number;
  marks?: Mark[];
};

export type Mark = {
  id: string;
  time: number; // seconds from start
  label?: string;
  createdAt: string;
};
