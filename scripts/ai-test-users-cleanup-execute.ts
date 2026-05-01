// Nachbar.io — AI-Testnutzer Cleanup-Execute
// Gefaehrlicher Pfad: loescht nur hart markierte AI-Testnutzer.
// NICHT ohne Founder-Go gegen Prod ausfuehren.
//
// Ausfuehrung:
//   AI_TEST_CLEANUP_MODE=execute npx tsx scripts/ai-test-users-cleanup-execute.ts
//
// Bestaetigung:
//   interaktiv oder per AI_TEST_CLEANUP_CONFIRMATION="AI-TESTNUTZER LOESCHEN:<count>"

import * as dotenv from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertAiTestCleanupExecuteMode,
  executeAiTestUsersCleanup,
  type ExecuteDb,
} from "@/lib/admin/ai-test-users-cleanup-execute";
import { getAdminSupabase } from "@/lib/supabase/admin";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function readConfirmation() {
  if (process.env.AI_TEST_CLEANUP_CONFIRMATION) {
    return process.env.AI_TEST_CLEANUP_CONFIRMATION;
  }

  const rl = createInterface({ input, output });
  try {
    return await rl.question(
      'Bestaetigung eingeben (Format: "AI-TESTNUTZER LOESCHEN:<count>"): ',
    );
  } finally {
    rl.close();
  }
}

async function main() {
  assertAiTestCleanupExecuteMode(process.env);

  const supabase = getAdminSupabase();
  const report = await executeAiTestUsersCleanup(
    supabase as unknown as ExecuteDb,
    supabase.auth.admin,
    { confirmation: await readConfirmation() },
  );
  const json = `${JSON.stringify(report, null, 2)}\n`;

  if (process.env.AI_TEST_CLEANUP_OUTPUT === "file") {
    const outputDir = resolve(process.cwd(), "output");
    await mkdir(outputDir, { recursive: true });
    const safeTimestamp = report.generatedAt.replaceAll(":", "-");
    const outputPath = resolve(outputDir, `ai-test-cleanup-execute-${safeTimestamp}.json`);
    await writeFile(outputPath, json, "utf8");
    console.log(`Execute-Bericht geschrieben: ${outputPath}`);
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
