import { NextResponse } from "next/server";
import { deleteTasksForRecord } from "@/lib/store";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await deleteTasksForRecord(id);
  if (!result) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...result });
}
