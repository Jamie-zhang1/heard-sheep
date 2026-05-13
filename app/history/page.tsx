import { HistoryClient } from "@/components/HistoryClient";
import { PhoneShell } from "@/components/PhoneShell";
import { listRecords } from "@/lib/store";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ filter?: string }>;
};

export default async function HistoryPage({ searchParams }: PageProps) {
  const { filter } = await searchParams;
  const records = await listRecords();

  return (
    <PhoneShell active="history">
      <HistoryClient records={records} filter={filter} />
    </PhoneShell>
  );
}
