// Nachbar.io — AI-Testnutzer Cleanup-Dry-Run
// Read-only Bericht. Kein Delete, kein Update, keine Auth-Admin-Aktion.
//
// Ausfuehrung:
//   AI_TEST_CLEANUP_MODE=dry-run npx tsx scripts/ai-test-users-cleanup-dry-run.ts
//
// Optionale CLI-Flags:
//   --strict            Nur historische Selektoren (is_test_user, test_user_kind, AI-Test%).
//   --before <YYYY-MM-DD>  Synthetik-Kandidaten nur fuer User mit created_at < before.
//
// Optionale ENV-Variablen:
//   AI_TEST_CLEANUP_ALLOWLIST_USER_IDS  Komma-getrennte UUIDs (z.B. Pilot-Onboarding-Test-Konten).
//   AI_TEST_CLEANUP_ALLOWLIST_EMAILS    Komma-getrennte E-Mails (zusaetzlich zur Founder-Allowlist).
//   AI_TEST_CLEANUP_OUTPUT=file         Schreibt Bericht nach output/.

import * as dotenv from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertAiTestCleanupDryRunMode,
  buildAiTestUsersCleanupDryRunReport,
  type DryRunDb,
  type DryRunOptions,
} from "@/lib/admin/ai-test-users-cleanup-dry-run";
import { getAdminSupabase } from "@/lib/supabase/admin";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

function parseCliArgs(argv: readonly string[]): DryRunOptions {
  const options: DryRunOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--strict") {
      options.strict = true;
      continue;
    }
    if (arg === "--before") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--before braucht ein Datum (YYYY-MM-DD)");
      }
      options.before = value;
      i += 1;
      continue;
    }
    if (arg.startsWith("--before=")) {
      options.before = arg.slice("--before=".length);
      continue;
    }
  }
  return options;
}

function parseEnvList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function buildSummary(
  report: Awaited<ReturnType<typeof buildAiTestUsersCleanupDryRunReport>>,
): string {
  const lines = [
    "Dry-Run-Zusammenfassung:",
    `  Hart markierte AI-Testnutzer (loeschbar via Execute): ${report.aiTestUsers.length}`,
    `  Unmarkierte Synthetik-Kandidaten (Founder-Hand-Review): ${report.unmarkedSyntheticCandidates.length}`,
    `  Allowlist-Skips: ${report.allowlistSkips.length}`,
    `  Unsichere Namens-Treffer: ${report.unsafeNameOnlyMatches.length}`,
    `  Optionen: strict=${report.options.strict}, before=${report.options.before ?? "-"}`,
  ];
  if (report.unmarkedSyntheticCandidates.length > 0) {
    lines.push("  Sample (erste 20 Synthetik-Kandidaten):");
    for (const candidate of report.unmarkedSyntheticCandidates.slice(0, 20)) {
      lines.push(
        `    - ${candidate.id} | ${candidate.displayName} | ${candidate.reason}`,
      );
    }
  }
  return lines.join("\n");
}

async function main() {
  assertAiTestCleanupDryRunMode(process.env);

  const cliOptions = parseCliArgs(process.argv.slice(2));
  const allowlistUserIds = parseEnvList(
    process.env.AI_TEST_CLEANUP_ALLOWLIST_USER_IDS,
  );
  const allowlistEmails = parseEnvList(
    process.env.AI_TEST_CLEANUP_ALLOWLIST_EMAILS,
  );

  const options: DryRunOptions = {
    ...cliOptions,
    ...(allowlistUserIds.length ? { allowlistUserIds } : {}),
    ...(allowlistEmails.length ? { allowlistEmails } : {}),
  };

  const report = await buildAiTestUsersCleanupDryRunReport(
    getAdminSupabase() as unknown as DryRunDb,
    options,
  );
  const json = `${JSON.stringify(report, null, 2)}\n`;

  if (process.env.AI_TEST_CLEANUP_OUTPUT === "file") {
    const outputDir = resolve(process.cwd(), "output");
    await mkdir(outputDir, { recursive: true });
    const safeTimestamp = report.generatedAt.replaceAll(":", "-");
    const outputPath = resolve(outputDir, `ai-test-cleanup-dry-run-${safeTimestamp}.json`);
    await writeFile(outputPath, json, "utf8");
    console.log(`Dry-Run-Bericht geschrieben: ${outputPath}`);
    console.log(buildSummary(report));
    return;
  }

  console.log(json);
  console.log(buildSummary(report));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
