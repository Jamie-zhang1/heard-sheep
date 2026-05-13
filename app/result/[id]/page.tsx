import { redirect } from "next/navigation";
import { PhoneShell } from "@/components/PhoneShell";
import { ResultView } from "@/components/ResultView";
import { getRecord } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getRecord(id);
  if (!record) redirect("/");
  return (
    <PhoneShell active="home">
      <ResultView record={record} />
    </PhoneShell>
  );
}
