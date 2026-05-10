// app/api/cron/event-reminders/route.ts
// Nachbar.io — Cron: Event Push-Erinnerungen
// Vercel Cron: Alle 15 Minuten
// Sendet Erinnerungen an RSVP-Teilnehmer (24h + 1h vor Event)

import { withCronHeartbeat } from "@/lib/care/with-cron-heartbeat";
import { processEventReminders } from "@/lib/event-reminders";

export const GET = withCronHeartbeat("event_reminders", async (supabase) => {
  const result = await processEventReminders(supabase);

  console.log(
    `[event-reminders] ${result.sent} Erinnerungen gesendet, ` +
      `${result.skipped} übersprungen, ${result.events} Events geprüft`,
  );

  return {
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  };
});
