// Nachbar.io — AI-Testnutzer Cleanup-Dry-Run
// Read-only Bericht. Kein Delete, kein Update, keine Auth-Admin-Aktion.
//
// Ausfuehrung:
//   AI_TEST_CLEANUP_MODE=dry-run npx tsx scripts/ai-test-users-cleanup-dry-run.ts

import * as dotenv from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertAiTestCleanupDryRunMode,
  buildAiTestUsersCleanupDryRunReport,
  type DryRunDb,
} from "@/lib/admin/ai-test-users-cleanup-dry-run";
import { getAdminSupabase } from "@/lib/supabase/admin";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  assertAiTestCleanupDryRunMode(process.env);

  const report = await buildAiTestUsersCleanupDryRunReport(getAdminSupabase() as unknown as DryRunDb);
  const json = `${JSON.stringify(report, null, 2)}\n`;

  if (process.env.AI_TEST_CLEANUP_OUTPUT === "file") {
    const outputDir = resolve(process.cwd(), "output");
    await mkdir(outputDir, { recursive: true });
    const safeTimestamp = report.generatedAt.replaceAll(":", "-");
    const outputPath = resolve(outputDir, `ai-test-cleanup-dry-run-${safeTimestamp}.json`);
    await writeFile(outputPath, json, "utf8");
    console.log(`Dry-Run-Bericht geschrieben: ${outputPath}`);
    return;
  }

  console.log(json);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
