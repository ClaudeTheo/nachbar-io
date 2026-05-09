// Nachbar.io — Test-Households Cleanup-Dry-Run
// Read-only Bericht. Kein Delete, kein Update, keine Auth-Admin-Aktion.
//
// Ausfuehrung:
//   TEST_HOUSEHOLDS_CLEANUP_MODE=dry-run npx tsx scripts/test-households-cleanup-dry-run.ts
//
// Optionale ENV-Variablen:
//   TEST_HOUSEHOLDS_CLEANUP_ALLOWLIST_QUARTER_IDS  Komma-getrennte UUIDs (Demo-Quartiere behalten).
//   TEST_HOUSEHOLDS_CLEANUP_OUTPUT=file            Schreibt Bericht nach output/.

import * as dotenv from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertTestHouseholdsCleanupDryRunMode,
  buildTestHouseholdsCleanupDryRunReport,
  type TestHouseholdsCleanupDryRunOptions,
  type TestHouseholdsDryRunDb,
} from "@/lib/admin/test-households-cleanup-dry-run";
import { getAdminSupabase } from "@/lib/supabase/admin";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

function parseEnvList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function buildSummary(
  report: Awaited<ReturnType<typeof buildTestHouseholdsCleanupDryRunReport>>,
): string {
  const lines = [
    "Households-Dry-Run-Zusammenfassung:",
    `  Synthetische Test-Households (E2E-Testweg etc.): ${report.summary.syntheticTestHouseholds}`,
    `  Demo-Quartier-Households (invite_code '<QUARTIER>-TEST-...'): ${report.summary.demoQuarterHouseholds}`,
    `  Whitespace-Drift im Strassennamen (UPDATE TRIM noetig): ${report.summary.whitespaceDriftHouseholds}`,
    `  Strassen-Schreibvarianten: ${report.summary.streetVariantGroups}`,
    `  Allowlist-Skips: ${report.summary.allowlistSkips}`,
  ];
  if (report.streetVariants.length > 0) {
    lines.push("  Strassen-Varianten-Details:");
    for (const variant of report.streetVariants.slice(0, 20)) {
      lines.push(
        `    - ${variant.canonical} (${variant.householdCount} Households): ${variant.variants.join(", ")}`,
      );
    }
  }
  if (report.whitespaceDriftHouseholds.length > 0) {
    lines.push("  Whitespace-Drift-Sample:");
    for (const h of report.whitespaceDriftHouseholds.slice(0, 20)) {
      lines.push(
        `    - ${h.id} | "${h.streetName}" -> "${h.trimmedStreetName}" (Quartier ${h.quarterId ?? "-"})`,
      );
    }
  }
  return lines.join("\n");
}

async function main() {
  assertTestHouseholdsCleanupDryRunMode(process.env);

  const allowlistQuarterIds = parseEnvList(
    process.env.TEST_HOUSEHOLDS_CLEANUP_ALLOWLIST_QUARTER_IDS,
  );
  const options: TestHouseholdsCleanupDryRunOptions = {
    ...(allowlistQuarterIds.length ? { allowlistQuarterIds } : {}),
  };

  const report = await buildTestHouseholdsCleanupDryRunReport(
    getAdminSupabase() as unknown as TestHouseholdsDryRunDb,
    options,
  );
  const json = `${JSON.stringify(report, null, 2)}\n`;

  if (process.env.TEST_HOUSEHOLDS_CLEANUP_OUTPUT === "file") {
    const outputDir = resolve(process.cwd(), "output");
    await mkdir(outputDir, { recursive: true });
    const safeTimestamp = report.generatedAt.replaceAll(":", "-");
    const outputPath = resolve(outputDir, `test-households-cleanup-dry-run-${safeTimestamp}.json`);
    await writeFile(outputPath, json, "utf8");
    console.log(`Households-Dry-Run-Bericht geschrieben: ${outputPath}`);
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
