import { NextResponse } from "next/server";
import { deleteTask, getTask, updateTask } from "@/lib/store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getTask(id);
  if (!result) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json(result);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const result = await updateTask(id, body);
  if (!result) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json(result);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await deleteTask(id);
  if (!result) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...result });
}
