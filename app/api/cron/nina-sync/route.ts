// app/api/cron/nina-sync/route.ts
// Nachbar.io — Prueft NINA-Warnungen.
// Neue Warnungen werden gespeichert + Push bei Severe/Extreme.
// Vercel Cron: siehe vercel.json

import { withCronHeartbeat } from "@/lib/care/with-cron-heartbeat";
import { runNinaSync } from "@/modules/info-hub/services/nina-sync.service";

export const GET = withCronHeartbeat("nina_sync", async (supabase) => {
  return await runNinaSync(supabase);
});
