// Einmal-Skript: Reprocess Amtsblatt Issue 0015 (5f27655e-92f1-4292-a7c7-97622dc64d09).
// Folge des Pilot-Reset 2026-04-19: extracted_count=70, aber announcements=0 (mit-geleert).
// Welle K2 baut den reprocessAmtsblattIssue-Service — hier direkter Aufruf via Service-Role.
//
// Ausfuehrung:
//   npx tsx scripts/reprocess-amtsblatt-issue-0015.ts
//
// Idempotent: Service loescht erst bestehende announcements, dann KI-Re-Extract aus PDF.

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getAdminSupabase } from "@/lib/supabase/admin";
import { reprocessAmtsblattIssue } from "@/lib/services/amtsblatt-sync.service";

const ISSUE_ID = "5f27655e-92f1-4292-a7c7-97622dc64d09";

async function main() {
  console.log(`[reprocess-0015] Start fuer Issue ${ISSUE_ID}`);
  const t0 = Date.now();
  const supabase = getAdminSupabase();
  const result = await reprocessAmtsblattIssue(supabase, ISSUE_ID);
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[reprocess-0015] OK in ${dt}s:`, result);
}

main().catch((err) => {
  console.error("[reprocess-0015] FAILED:", err);
  process.exit(1);
});
