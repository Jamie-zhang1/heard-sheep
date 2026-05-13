import { redirect } from "next/navigation";
import { PhoneShell } from "@/components/PhoneShell";
import { TaskDetailClient } from "@/components/TaskDetailClient";
import { getTask } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getTask(id);
  if (!result) redirect("/");
  return (
    <PhoneShell active="tasks">
      <TaskDetailClient initialRecord={result.record} initialTask={result.task} />
    </PhoneShell>
  );
}
