// app/api/cron/recurring-events/route.ts
// Nachbar.io — Cron: Wiederkehrende Events
// Vercel Cron: Täglich um 04:00
// Erstellt nächste Instanz für vergangene wiederkehrende Events

import { withCronHeartbeat } from "@/lib/care/with-cron-heartbeat";
import { processRecurringEvents } from "@/lib/recurring-events";

export const GET = withCronHeartbeat("recurring_events", async (supabase) => {
  const result = await processRecurringEvents(supabase);

  console.log(
    `[recurring-events] ${result.created} neue Instanzen erstellt, ` +
      `${result.skipped} übersprungen, ${result.total} Events geprüft`,
  );

  return {
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  };
});
