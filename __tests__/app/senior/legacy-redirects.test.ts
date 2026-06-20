// __tests__/app/senior/legacy-redirects.test.ts
// Welle S1 (2026-06-12) — "Eine Senior-Welt": Der Legacy-Pfad app/senior/* ist
// stillgelegt. Jede Legacy-Seite redirectet serverseitig in die kanonische
// (senior)-Shell. Kein Code unter app/senior/** schreibt mehr in die seit
// Mig 032 deprecatete Tabelle senior_checkins (Befund A3:2 / B1:6 / A4:4).

import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const redirectMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

beforeEach(() => {
  redirectMock.mockClear();
});

describe("Welle S1 — Legacy-Senior-Routen redirecten in die (senior)-Shell", () => {
  it("/senior leitet auf /kreis-start", async () => {
    const { default: Page } = await import("@/app/senior/page");
    Page();
    expect(redirectMock).toHaveBeenCalledWith("/kreis-start");
  });

  it("/senior/home leitet auf /kreis-start", async () => {
    const { default: Page } = await import("@/app/senior/home/page");
    Page();
    expect(redirectMock).toHaveBeenCalledWith("/kreis-start");
  });

  it("/senior/checkin leitet auf /checkin (kanonischer Check-in)", async () => {
    const { default: Page } = await import("@/app/senior/checkin/page");
    Page();
    expect(redirectMock).toHaveBeenCalledWith("/checkin");
  });

  it("/senior/help leitet auf /kreis-start (kein erzwungener SOS-Flow)", async () => {
    const { default: Page } = await import("@/app/senior/help/page");
    Page();
    expect(redirectMock).toHaveBeenCalledWith("/kreis-start");
  });

  it("/senior/news leitet auf /hier-bei-mir (Info-Hub)", async () => {
    const { default: Page } = await import("@/app/senior/news/page");
    Page();
    expect(redirectMock).toHaveBeenCalledWith("/hier-bei-mir");
  });

  it("/senior/medications leitet auf /medications", async () => {
    const { default: Page } = await import("@/app/senior/medications/page");
    Page();
    expect(redirectMock).toHaveBeenCalledWith("/medications");
  });
});

describe("Welle S1 — Guard: kein senior_checkins-Schreibzugriff in app/senior/**", () => {
  it("keine Datei unter app/senior schreibt in die deprecatete Tabelle senior_checkins", () => {
    const seniorDir = join(process.cwd(), "app", "senior");
    const offenders: string[] = [];

    function walk(dir: string) {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
        } else if (/\.(ts|tsx)$/.test(entry)) {
          const src = readFileSync(full, "utf8");
          // Schreibende Supabase-Operation (insert/upsert/update/delete) auf
          // senior_checkins. Lesende Fallbacks bleiben erlaubt; nur Schreiben
          // ist nach Mig 032 deprecatet (Geräte-Pfad device.service.ts schreibt
          // weiter als Abwärtskompatibilität, liegt aber nicht unter app/senior).
          if (
            /from\(\s*["'`]senior_checkins["'`]\s*\)\s*\.(insert|upsert|update|delete)\b/.test(
              src,
            )
          ) {
            offenders.push(full);
          }
        }
      }
    }

    walk(seniorDir);
    expect(offenders).toEqual([]);
  });
});
