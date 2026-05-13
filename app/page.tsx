import { HomeClient } from "@/components/HomeClient";
import { PhoneShell } from "@/components/PhoneShell";
import { listRecords } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const records = await listRecords();
  return (
    <PhoneShell active="home">
      <HomeClient records={records} />
    </PhoneShell>
  );
}

