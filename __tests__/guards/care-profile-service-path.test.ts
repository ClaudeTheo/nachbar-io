// Nachbar.io — Guard gegen direkte Notfallkontakt-Bypasses

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const ALLOWED_CARE_PROFILE_TABLE_FILES = new Set([
  "modules/care/services/profile.service.ts",
  "modules/care/services/consent-routes.service.ts",
  "modules/care/services/stats.service.ts",
  "modules/care/services/reports/generator.ts",
  "modules/care/services/health.ts",
  "modules/care/services/cron-checkin.service.ts",
  "modules/care/services/cron-escalation.service.ts",
  "modules/care/services/checkin.service.ts",
]);

function walkProductionFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const repoPath = toRepoPath(fullPath);

    if (
      repoPath.includes("/__tests__/") ||
      repoPath === "lib/supabase/database.types.ts"
    ) {
      continue;
    }

    if (statSync(fullPath).isDirectory()) {
      walkProductionFiles(fullPath, files);
      continue;
    }

    if (
      (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) &&
      !fullPath.endsWith(".test.ts") &&
      !fullPath.endsWith(".test.tsx")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function productionFiles(): string[] {
  return ["app", "modules", "lib"].flatMap((dir) =>
    walkProductionFiles(join(ROOT, dir)),
  );
}

function toRepoPath(file: string): string {
  return relative(ROOT, file).replaceAll("\\", "/");
}

describe("care_profiles emergency_contacts service path guard", () => {
  it("haelt direkte care_profiles-Tabellenzugriffe ausserhalb erlaubter Serverpfade fern", () => {
    const offenders = productionFiles()
      .map((file) => ({
        path: toRepoPath(file),
        source: readFileSync(file, "utf8"),
      }))
      .filter(({ path, source }) => {
        if (!source.match(/\.from\(\s*["']care_profiles["']\s*\)/)) {
          return false;
        }

        return !ALLOWED_CARE_PROFILE_TABLE_FILES.has(path);
      })
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("laesst emergency_contacts nur ueber Servicepfad, Revoke-Nullung oder entschluesselte Server-Reads laufen", () => {
    const allowedEmergencyContactFiles = new Set([
      "modules/care/services/profile.service.ts",
      "modules/care/services/consent-routes.service.ts",
      "modules/care/services/consent.ts",
      "modules/care/services/types.ts",
      "modules/care/services/constants.ts",
      "modules/care/services/field-encryption.ts",
      "modules/care/components/profile/CareProfileForm.tsx",
      "modules/care/components/consent/ConsentFeatureCard.tsx",
      "lib/sos/notify-family.ts",
      "lib/messaging/schreiben-contacts.ts",
      "lib/care/field-encryption.ts",
      "app/api/care/profile/route.ts",
      "app/(senior)/profil/page.tsx",
      "app/(senior)/schreiben/page.tsx",
      "app/(senior)/schreiben/mic/[recipientId]/page.tsx",
      "app/(senior)/schreiben/review/[recipientId]/page.tsx",
      "app/(app)/care/consent/page.tsx",
    ]);

    const offenders = productionFiles()
      .map((file) => ({
        path: toRepoPath(file),
        source: readFileSync(file, "utf8"),
      }))
      .filter(({ path, source }) => {
        if (!source.includes("emergency_contacts")) {
          return false;
        }

        return !allowedEmergencyContactFiles.has(path);
      })
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });
});
