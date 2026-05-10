// Cron-Route: Amtsblatt-Sync
// Vercel Cron: samstags um 08:00 UTC
// Thin wrapper — Business-Logik in lib/services/amtsblatt-sync.service.ts

import { withCronHeartbeat } from "@/lib/care/with-cron-heartbeat";
import { runAmtsblattSync } from "@/lib/services/amtsblatt-sync.service";

export const runtime = "nodejs";
export const maxDuration = 120; // PDF-Download + KI braucht Zeit

export const GET = withCronHeartbeat("amtsblatt_sync", async (supabase) => {
  return await runAmtsblattSync(supabase);
});
