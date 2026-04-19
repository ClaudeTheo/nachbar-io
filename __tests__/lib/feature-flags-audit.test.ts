// Audit-Test: verhindert tote Gesundheits-Flags.
// Wenn jemand einen neuen Flag in die Admin-UI / Migration aufnimmt, aber
// vergisst, ihn im Code auszuwerten, faellt dieser Test.
//
// Hintergrund: Vor Stufe 3 (2026-04-19) waren APPOINTMENTS_ENABLED,
// VIDEO_CONSULTATION, GDT_ENABLED und HEARTBEAT_ENABLED in der DB und in der
// Admin-UI sichtbar, wurden im Code aber nie ausgewertet - Admin-Toggle
// hatte keinen Effekt. Dieser Test verhindert die Wiederkehr.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { glob } from "glob";
import { join } from "path";

const HEALTH_FLAGS = [
  "MEDICATIONS_ENABLED",
  "DOCTORS_ENABLED",
  "APPOINTMENTS_ENABLED",
  "VIDEO_CONSULTATION",
  "HEARTBEAT_ENABLED",
  "GDT_ENABLED",
] as const;

const PROJECT_ROOT = join(__dirname, "..", "..");

describe("Feature-Flag-Audit (Gesundheit)", () => {
  // Produktions-Code, in dem Flags verwendet werden koennten
  const patterns = [
    "lib/**/*.{ts,tsx}",
    "app/**/*.{ts,tsx}",
    "modules/**/*.{ts,tsx}",
    "proxy.ts",
  ];

  const codeFiles = patterns
    .flatMap((p) =>
      glob.sync(p, {
        cwd: PROJECT_ROOT,
        ignore: [
          "**/node_modules/**",
          "**/__tests__/**",
          "**/*.test.ts",
          "**/*.test.tsx",
          "**/.next/**",
          "**/dist/**",
        ],
      }),
    )
    .map((f) => join(PROJECT_ROOT, f));

  const allCode = codeFiles
    .map((f) => {
      try {
        return readFileSync(f, "utf8");
      } catch {
        return "";
      }
    })
    .join("\n");

  it("mindestens 50 Code-Dateien gescannt (Sanity-Check)", () => {
    // Stellt sicher, dass der Glob tatsaechlich Dateien findet.
    expect(codeFiles.length).toBeGreaterThan(50);
  });

  it.each(HEALTH_FLAGS)("%s wird im Produktions-Code ausgewertet", (flag) => {
    expect(
      allCode,
      `Flag ${flag} existiert in Admin-UI/Migration, wird aber nirgends ` +
        `im Code ausgewertet. Bitte verdrahten (z.B. ueber health-feature-gate).`,
    ).toContain(flag);
  });
});
