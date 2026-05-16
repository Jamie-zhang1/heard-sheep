import { NextResponse } from "next/server";
import { addTask, addTaskFromCandidate, addTasksFromCandidates, listRecords } from "@/lib/store";
import type { CandidateTaskItem, TaskItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const records = await listRecords();
  const tasks = records.flatMap((record) =>
    record.tasks.map((task) => ({
      ...task,
      recordTitle: record.title,
      recordCreatedAt: record.createdAt
    }))
  );
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<TaskItem & CandidateTaskItem> & {
    recordId?: string;
    candidateId?: string;
    candidates?: Array<{ id: string; patch?: Partial<CandidateTaskItem> }>;
  };
  if (!body.recordId) {
    return NextResponse.json(
      { code: "RECORD_REQUIRED", message: "手动添加任务需要 recordId" },
      { status: 400 }
    );
  }

  if (body.candidates?.length) {
    const result = await addTasksFromCandidates(body.recordId, body.candidates);
    if (!result) {
      return NextResponse.json({ code: "NOT_FOUND", message: "记录不存在" }, { status: 404 });
    }
    return NextResponse.json(result, { status: 201 });
  }

  if (body.candidateId) {
    const result = await addTaskFromCandidate(body.recordId, body.candidateId, body);
    if (!result) {
      return NextResponse.json({ code: "NOT_FOUND", message: "候选任务不存在" }, { status: 404 });
    }
    return NextResponse.json(result, { status: 201 });
  }

  const result = await addTask(body.recordId, body);
  if (!result) {
    return NextResponse.json({ code: "NOT_FOUND", message: "记录不存在" }, { status: 404 });
  }
  return NextResponse.json(result, { status: 201 });
}
