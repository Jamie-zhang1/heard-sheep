import { MeClient } from "@/components/MeClient";
import { PhoneShell } from "@/components/PhoneShell";
import { listRecords } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const records = await listRecords();
  return (
    <PhoneShell active="me">
      <MeClient initialRecords={records} />
    </PhoneShell>
  );
}
