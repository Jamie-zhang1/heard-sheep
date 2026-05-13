import { z } from "zod";
import type { AnalyzeResult } from "@/lib/types";

export const analyzeTaskSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    priority: z.enum(["high", "medium", "low"]),
    priority_reason: z.string().min(1),
    deadline_text: z.string(),
    deadline_date: z.string().nullable(),
    deliverable: z.string(),
    assignee: z.string(),
    dependencies: z.array(z.string()),
    steps: z.array(z.string()),
    missing_info: z.array(z.string()),
    confirm_questions: z.array(z.string()),
    risk: z.string(),
    source_evidence: z.string().min(1),
    confidence: z.enum(["high", "medium", "low"]),
    need_confirm: z.boolean(),
    status: z.enum(["todo", "doing", "done"]),
    labels: z.array(z.string()).optional()
  })
  .strict();

export const analyzeResultSchema = z
  .object({
    title: z.string().min(1),
    summary: z.string().min(1),
    organized_text: z
      .object({
        cleaned_text: z.string().min(1),
        key_points: z.array(z.string()),
        time_mentions: z.array(z.string()),
        special_requirements: z.array(z.string())
      })
      .strict(),
    tasks: z.array(analyzeTaskSchema),
    global_confirm_questions: z.array(z.string()),
    warnings: z.array(z.string())
  })
  .strict();

export type ValidatedAnalyzeResult = z.infer<typeof analyzeResultSchema>;

export function validateAnalyzeResult(value: unknown): AnalyzeResult {
  const parsed = analyzeResultSchema.parse(value);
  return parsed;
}

export function formatZodError(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}
