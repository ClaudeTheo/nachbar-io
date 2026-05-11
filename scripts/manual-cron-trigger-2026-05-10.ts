// Einmal-Skript: Manueller Trigger fuer 3 Cron-Services nach 15-Tage-Outage.
// 2026-05-10: ruft waste-sync, quartier-events-sync, quartier-info-sync direkt
// via Service-Role auf, damit der Pilot nicht erst auf den naechsten Schedule
// wartet (waste 02:00, events 06:00).
//
// Ausfuehrung:
//   npx tsx scripts/manual-cron-trigger-2026-05-10.ts

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getAdminSupabase } from "@/lib/supabase/admin";
import { runWasteSync } from "@/modules/waste";
import { runQuartierEventsSync } from "@/modules/info-hub/services/quartier-events-sync.service";
import { runQuartierInfoSync } from "@/modules/info-hub/services/quartier-info-sync.service";

async function timed<T>(name: string, fn: () => Promise<T>): Promise<void> {
  const t0 = Date.now();
  try {
    const result = await fn();
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[${name}] OK in ${dt}s:`, JSON.stringify(result).slice(0, 300));
  } catch (err) {
    console.error(`[${name}] FAILED:`, err);
  }
}

async function main() {
  const supabase = getAdminSupabase();
  await Promise.all([
    timed("waste-sync", () => runWasteSync()),
    timed("quartier-events-sync", () => runQuartierEventsSync(supabase)),
    timed("quartier-info-sync", () => runQuartierInfoSync(supabase)),
  ]);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
