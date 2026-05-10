// app/api/cron/quartier-events-sync/route.ts
// Nachbar.io — Projiziert vorhandene Quartier-Events in municipal_config.events.
// Vercel-Cron: taeglich 06:00 UTC.

import { withCronHeartbeat } from "@/lib/care/with-cron-heartbeat";
import { runQuartierEventsSync } from "@/modules/info-hub/services/quartier-events-sync.service";

export const GET = withCronHeartbeat(
  "quartier_events_sync",
  async (supabase) => {
    return await runQuartierEventsSync(supabase);
  },
);
