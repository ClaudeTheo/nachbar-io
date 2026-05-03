// Nachbar.io — Guard fuer sichtbares SOS-/Notfall-Wording

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const USER_VISIBLE_FILES = [
  "app/(app)/care/meine-senioren/[seniorId]/page.tsx",
  "app/(auth)/testanleitung/page.tsx",
  "docs/API_REFERENCE.md",
  "docs/ARCHITECTURE.md",
  "docs/CARE_MODULE_WORKFLOWS.md",
  "docs/TESTANLEITUNG.md",
  "lib/help-content.ts",
  "modules/care/services/billing.ts",
];

const FORBIDDEN_VISIBLE_PHRASES = [
  "Medizinischer Notfall",
  "medizinischer Notfall",
  "Notfall-SOS",
];

describe("sichtbares SOS-Wording", () => {
  it("vermeidet medizinische Leistungsversprechen in Nutzer- und Store-nahen Texten", () => {
    const offenders = USER_VISIBLE_FILES.flatMap((relativePath) => {
      const content = readFileSync(join(process.cwd(), relativePath), "utf8");
      return FORBIDDEN_VISIBLE_PHRASES.flatMap((phrase) =>
        content.includes(phrase) ? [`${relativePath}: ${phrase}`] : [],
      );
    });

    expect(offenders).toEqual([]);
  });
});
