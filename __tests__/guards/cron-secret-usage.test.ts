import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const EXTRA_PROTECTED_FILES = [
  "app/api/news/aggregate/route.ts",
  "app/api/news/rss/route.ts",
  "app/api/news/scrape/route.ts",
  "app/api/prevention/reminders/route.ts",
  "app/api/security/forensic-ingest/route.ts",
  "lib/security/security-middleware.ts",
];

function walkRoutes(relativeDir: string): string[] {
  const absoluteDir = join(ROOT, relativeDir);
  return readdirSync(absoluteDir).flatMap((entry) => {
    const absolutePath = join(absoluteDir, entry);
    const relativePath = join(relativeDir, entry).replace(/\\/g, "/");
    const stat = statSync(absolutePath);
    if (stat.isDirectory()) return walkRoutes(relativePath);
    return relativePath.endsWith("/route.ts") ? [relativePath] : [];
  });
}

describe("cron secret usage guard", () => {
  const protectedFiles = [
    ...walkRoutes("app/api/cron"),
    ...walkRoutes("app/api/care/cron"),
    ...EXTRA_PROTECTED_FILES,
  ].sort();

  // Jede Datei genau einmal lesen statt pro it()-Block erneut.
  const protectedSources = protectedFiles.map((file) => ({
    file,
    source: readFileSync(join(ROOT, file), "utf8"),
  }));

  it("nutzt den zentralen timing-safe Cron-Secret-Helper", () => {
    const offenders = protectedSources
      .filter(
        ({ source }) =>
          source.includes("CRON_SECRET") &&
          !source.includes("@/lib/security/cron-secret") &&
          !source.includes("./cron-secret"),
      )
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it("enthaelt keine direkten Bearer-Stringvergleiche mit CRON_SECRET", () => {
    const directBearerComparisons = protectedSources
      .filter(({ source }) => /[`'"]Bearer\s+\$\{cronSecret\}[`'"]/.test(source))
      .map(({ file }) => file);

    expect(directBearerComparisons).toEqual([]);
  });

  it("enthaelt keine direkten Vergleiche gegen process.env.CRON_SECRET", () => {
    const directEnvComparisons = protectedSources
      .filter(({ source }) =>
        /[!=]={2,3}\s*process\.env\.CRON_SECRET|process\.env\.CRON_SECRET\s*[!=]={2,3}/.test(
          source,
        ),
      )
      .map(({ file }) => file);

    expect(directEnvComparisons).toEqual([]);
  });
});
