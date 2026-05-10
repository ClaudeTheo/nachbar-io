// app/api/cron/quartier-info-sync/route.ts
// Nachbar.io — Holt Wetter- und Pollendaten fuer alle aktiven Quartiere.
// Vercel Cron: stuendlich (Pollen wird nur 1x/Tag aktualisiert).

import { withCronHeartbeat } from "@/lib/care/with-cron-heartbeat";
import { runQuartierInfoSync } from "@/modules/info-hub/services/quartier-info-sync.service";

export const GET = withCronHeartbeat("quartier_info_sync", async (supabase) => {
  return await runQuartierInfoSync(supabase);
});
