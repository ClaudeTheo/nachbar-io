// Nachbar.io — Guard gegen ungepruefte SMS-/Twilio-Providerpfade

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const INVENTORY_PATH = "docs/plans/2026-05-03-t03b-direct-sms-path-inventory.md";

const ALLOWED_TWILIO_PROVIDER_FILES = new Set([
  "modules/care/services/channels/sms.ts",
  "modules/care/services/channels/voice.ts",
]);

function toRepoPath(file: string): string {
  return relative(ROOT, file).replaceAll("\\", "/");
}

function walkProductionFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const repoPath = toRepoPath(fullPath);

    if (repoPath.includes("/__tests__/")) {
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

// Walk + Source-Read genau einmal pro Testlauf: beide it()-Bloecke teilen sich
// den Cache, statt den ~1,3-MB-Produktions-Tree je erneut zu walken/lesen.
let productionFilesCache: string[] | undefined;
function productionFiles(): string[] {
  return (productionFilesCache ??= ["app", "modules", "lib"].flatMap((dir) =>
    walkProductionFiles(join(ROOT, dir)),
  ));
}

let productionSourcesCache: { path: string; source: string }[] | undefined;
function productionSources(): { path: string; source: string }[] {
  return (productionSourcesCache ??= productionFiles().map((file) => ({
    path: toRepoPath(file),
    source: readFileSync(file, "utf8"),
  })));
}

function callsiteFiles(pattern: RegExp): string[] {
  return productionSources()
    .filter(({ source }) => pattern.test(source))
    .map(({ path }) => path)
    .sort();
}

describe("direct SMS provider path inventory", () => {
  it("laesst Twilio-SDK-Zugriff nur in den zentralen Kanaelen zu", () => {
    const offenders = callsiteFiles(/import\(["']twilio["']\)|twilio\.default\(/)
      .filter((path) => !ALLOWED_TWILIO_PROVIDER_FILES.has(path));

    expect(offenders).toEqual([]);
  });

  it("dokumentiert alle direkten SMS-/Voice-Aufrufer im Inventar", () => {
    const inventoryFile = join(ROOT, INVENTORY_PATH);
    expect(existsSync(inventoryFile)).toBe(true);

    const inventory = readFileSync(inventoryFile, "utf8");
    const callsites = callsiteFiles(/\b(sendSms|initiateCall)\s*\(/)
      .filter((path) => !ALLOWED_TWILIO_PROVIDER_FILES.has(path));

    const missing = callsites.filter((path) => !inventory.includes(path));

    expect(missing).toEqual([]);
  });
});
