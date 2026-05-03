// Nachbar.io — Guard gegen versehentlich oeffentliche TTS-Caches

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const INVENTORY_PATH = "docs/plans/2026-05-03-tts-public-cache-privacy-guard.md";

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

function productionFiles(): string[] {
  return ["app", "modules", "lib"].flatMap((dir) =>
    walkProductionFiles(join(ROOT, dir)),
  );
}

describe("TTS public cache privacy guard", () => {
  it("haelt den Service default-private und public-cache nur als expliziten Opt-in", () => {
    const service = readFileSync(
      join(ROOT, "modules/voice/services/tts.service.ts"),
      "utf8",
    );
    const route = readFileSync(join(ROOT, "app/api/voice/tts/route.ts"), "utf8");

    expect(service).toContain('cache?: "public"');
    expect(service).toContain('publicCache: params.cache === "public"');
    expect(service).toContain('let cacheHeader = "disabled"');
    expect(route).toContain('cache: body.cache === "public" ? "public" : undefined');
  });

  it("dokumentiert jeden Produktions-Aufrufer mit public-cache Opt-in", () => {
    const inventoryFile = join(ROOT, INVENTORY_PATH);
    expect(existsSync(inventoryFile)).toBe(true);

    const inventory = readFileSync(inventoryFile, "utf8");
    const publicCacheCallsites = productionFiles()
      .map((file) => ({
        path: toRepoPath(file),
        source: readFileSync(file, "utf8"),
      }))
      .filter(({ path }) => path !== "modules/voice/services/tts.service.ts")
      .filter(({ source }) => {
        if (!source.includes("/api/voice/tts") && !source.includes("synthesizeSpeech(")) {
          return false;
        }

        return /cache\s*:\s*["']public["']/.test(source);
      })
      .map(({ path }) => path)
      .sort();

    const missing = publicCacheCallsites.filter((path) => !inventory.includes(path));

    expect(missing).toEqual([]);
  });
});
