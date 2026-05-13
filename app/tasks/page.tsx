import { PhoneShell } from "@/components/PhoneShell";
import { TasksClient } from "@/components/TasksClient";
import { listRecords } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const records = await listRecords();
  return (
    <PhoneShell active="tasks">
      <TasksClient records={records} />
    </PhoneShell>
  );
}

