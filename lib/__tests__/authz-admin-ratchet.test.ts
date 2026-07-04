// lib/__tests__/authz-admin-ratchet.test.ts
// Nachbar.io — Ratchet-Test gegen neue RLS-Bypass-Routen (R2, Architektur-Review 2026-07-04)
//
// Kontext: ~69 von 307 API-Routen importieren den service_role-Client
// (lib/supabase/admin) direkt und implementieren Ownership-/IDOR-Checks von Hand.
// Diese Zahl darf NICHT unbemerkt wachsen: Jede neue Bypass-Route ist ein neuer
// Wurf des IDOR-Wuerfels (Lehre: ADM-3, Pass 63, A4:2).
//
// Regel: Neue Routen gehen ueber RLS (Anon-Client) oder verlagern service_role-
// Zugriffe in einen *.service.ts mit explizitem Ownership-Check
// (Muster: lib/care/api-helpers.ts + modules/*/services/*).
// Wer die Baseline BEWUSST erhoeht, aendert sie hier mit Begruendung im Diff —
// dann ist es eine sichtbare Review-Entscheidung statt stiller Drift.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Stand 2026-07-04 (65x "@/lib/supabase/admin" + 4x '@/lib/supabase/admin')
const ADMIN_ROUTE_BASELINE = 69;

function collectRouteFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectRouteFiles(full, acc);
    } else if (entry.name === "route.ts") {
      acc.push(full);
    }
  }
  return acc;
}

describe("Authz-Ratchet: service_role-Nutzung in API-Routen", () => {
  it(`hoechstens ${ADMIN_ROUTE_BASELINE} route.ts-Dateien importieren lib/supabase/admin direkt`, () => {
    const apiDir = join(process.cwd(), "app", "api");
    const routeFiles = collectRouteFiles(apiDir);
    expect(routeFiles.length).toBeGreaterThan(0);

    const offenders = routeFiles.filter((file) =>
      readFileSync(file, "utf8").includes("supabase/admin"),
    );

    if (offenders.length > ADMIN_ROUTE_BASELINE) {
      const known = ADMIN_ROUTE_BASELINE;
      throw new Error(
        `${offenders.length} Routen importieren lib/supabase/admin direkt (Baseline: ${known}).\n` +
          `Eine NEUE Route umgeht RLS. Bitte: service_role-Zugriff in einen *.service.ts mit ` +
          `explizitem Ownership-Check verlagern (Muster: lib/care/api-helpers.ts) — oder die ` +
          `Baseline in lib/__tests__/authz-admin-ratchet.test.ts bewusst und begruendet erhoehen.\n` +
          `Routen:\n${offenders.map((f) => `  - ${f}`).join("\n")}`,
      );
    }

    expect(offenders.length).toBeLessThanOrEqual(ADMIN_ROUTE_BASELINE);
  });
});
