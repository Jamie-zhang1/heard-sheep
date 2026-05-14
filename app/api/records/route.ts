import { NextResponse } from "next/server";
import { createRecord, listRecords, writeRecords } from "@/lib/store";
import type { RecordCreateInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const records = await listRecords();
  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RecordCreateInput;
    const isImageRecord = body.source === "image";
    if (!body.analysis || !body.source || (!isImageRecord && (!body.transcriptText || !body.rawText))) {
      return NextResponse.json(
        { code: "INVALID_RECORD", message: "保存记录缺少必要字段" },
        { status: 400 }
      );
    }
    const record = await createRecord(body);
    return NextResponse.json({ record }, { status: 201 });
  } catch {
    return NextResponse.json(
      { code: "SAVE_RECORD_FAILED", message: "保存历史记录失败" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await writeRecords([]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { code: "CLEAR_RECORDS_FAILED", message: "清空本地数据失败" },
      { status: 500 }
    );
  }
}
