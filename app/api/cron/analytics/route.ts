// app/api/cron/analytics/route.ts
// Nachbar.io — Analytics Cron: Berechnet täglich KPI-Snapshots pro Quartier
// Vercel Cron: täglich um 3:00 Uhr

import { withCronHeartbeat } from "@/lib/care/with-cron-heartbeat";
import { runAnalyticsCron } from "@/lib/services/cron-analytics.service";

export const GET = withCronHeartbeat("analytics", async (supabase) => {
  return await runAnalyticsCron(supabase);
});
