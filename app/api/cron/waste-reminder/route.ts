// app/api/cron/waste-reminder/route.ts
// Nachbar.io — Cron: Müllabfuhr Push-Erinnerungen
// Vercel Cron: Täglich um 18:00 Uhr (Vorabend der Abholung)

import { withCronHeartbeat } from "@/lib/care/with-cron-heartbeat";
import { runWasteReminder } from "@/modules/waste/services/waste-reminder.service";

export const dynamic = "force-dynamic";

export const GET = withCronHeartbeat("waste_reminder", async (supabase) => {
  return await runWasteReminder(supabase);
});
