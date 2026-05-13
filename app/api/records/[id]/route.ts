import { NextResponse } from "next/server";
import { deleteRecord, getRecord, updateRecord } from "@/lib/store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getRecord(id);
  if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  return NextResponse.json({ record });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const record = await updateRecord(id, body);
  if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  return NextResponse.json({ record });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteRecord(id);
  if (!deleted) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
