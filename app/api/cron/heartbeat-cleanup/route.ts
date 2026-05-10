// app/api/cron/heartbeat-cleanup/route.ts
// Nachbar.io — Heartbeat-Cleanup: Loescht Heartbeats aelter als 90 Tage
// Vercel Cron: wöchentlich Sonntag 3:00 Uhr

import { withCronHeartbeat } from "@/lib/care/with-cron-heartbeat";
import { runHeartbeatCleanup } from "@/lib/services/cron-heartbeat-cleanup.service";

export const GET = withCronHeartbeat("heartbeat_cleanup", async (supabase) => {
  return await runHeartbeatCleanup(supabase);
});
