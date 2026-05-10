// app/api/care/cron/tasks/route.ts
// Nachbar.io — Tasks-Erinnerungs-Cron (Vercel Cron: alle 2 Stunden)

import { withCronHeartbeat } from "@/lib/care/with-cron-heartbeat";
import { runTasksCron } from "@/modules/care/services/cron-tasks.service";

export const GET = withCronHeartbeat("task_cleanup", async (supabase) => {
  return await runTasksCron(supabase);
});
