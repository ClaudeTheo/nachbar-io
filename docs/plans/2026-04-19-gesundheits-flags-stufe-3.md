# Gesundheits-Feature-Flags Stufe 3 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Alle Gesundheitsfunktionen (Medikamente, Ärzte, Termine, Online-Sprechstunde, GDT, Heartbeat) werden über das Admin-Dashboard per Feature-Flag aktivierbar. Toggle in Admin-UI → Feature ist live (Route zugänglich, UI-Kachel klickbar). Toggle aus → Feature ist komplett dicht (Middleware-Redirect, UI-Kachel grau).

**Architecture:**
- Bestehendes Middleware-Gate in `proxy.ts` wird *Flag-aware*: statt harter `isLegacyRoute()`-Redirect ein zweistufiger Check (Health-Route → Flag-Lookup; Nicht-Health-Legacy → harter Redirect wie bisher).
- Flag-Lookup in Middleware via `isFeatureEnabledServer()`. Performance: Cache in Redis (eine Anfrage pro 60 s pro Flag).
- Zwei neue Flags (`MEDICATIONS_ENABLED`, `DOCTORS_ENABLED`) per Migration 170.
- Admin-UI bekommt neue Gruppe „Gesundheit" mit allen 6 relevanten Flags.
- Audit-Test liest alle Flags aus `feature_flags`-Migration und grept Code-Basis — fail bei Flag ohne Nutzung.

**Tech Stack:** Next.js 16 App Router, Supabase, TypeScript strict, Vitest. Route-Gate in `proxy.ts`, DB-Migration SQL.

**Scope:** 6 Flags — 4 existierende (`APPOINTMENTS_ENABLED`, `VIDEO_CONSULTATION`, `GDT_ENABLED`, `HEARTBEAT_ENABLED`) + 2 neue (`MEDICATIONS_ENABLED`, `DOCTORS_ENABLED`).

**Out of scope:** Arzt-Portal (eigene Subdomain `nachbar-arzt`) — bleibt wie es ist. Nur `nachbar-io`-seitige Verlinkungen.

**Rote Zone:** Task 2 (Migration 170 auf Prod) + Task 9 (Push). Beide brauchen Founder-Go.

---

## Gesundheits-Routes Map (Stand 2026-04-19)

| Flag | Routes | UI-Kachel |
|---|---|---|
| `MEDICATIONS_ENABLED` | `/care/medications` | Care-Hub Tile „Medikamente" |
| `DOCTORS_ENABLED` | `/care/aerzte` | Care-Hub Tile „Ärzte" |
| `APPOINTMENTS_ENABLED` | `/care/appointments` | Care-Hub Tile „Termine" |
| `VIDEO_CONSULTATION` | `/care/sprechstunde`, `/care/consultations` | Care-Hub Tile „Online-Sprechstunde" |
| `GDT_ENABLED` | `/arzt` (Portal-Link) | Admin/Doktor-Portal-Einstieg |
| `HEARTBEAT_ENABLED` | `/care/heartbeat`, `/care/checkin` | Care-Hub Tile „Lebenszeichen" |

---

## Task 1: Lib-Helper für Health-Route-Flag-Mapping

**Files:**
- Create: `lib/health-feature-gate.ts`
- Test: `lib/__tests__/health-feature-gate.test.ts`

**Step 1: Test schreiben**

```ts
import { describe, it, expect } from "vitest";
import { getRequiredFlagForRoute, HEALTH_ROUTES } from "@/lib/health-feature-gate";

describe("getRequiredFlagForRoute", () => {
  it("liefert MEDICATIONS_ENABLED fuer /care/medications", () => {
    expect(getRequiredFlagForRoute("/care/medications")).toBe("MEDICATIONS_ENABLED");
  });
  it("liefert DOCTORS_ENABLED fuer /care/aerzte/42", () => {
    expect(getRequiredFlagForRoute("/care/aerzte/42")).toBe("DOCTORS_ENABLED");
  });
  it("liefert VIDEO_CONSULTATION fuer /care/sprechstunde und /care/consultations", () => {
    expect(getRequiredFlagForRoute("/care/sprechstunde")).toBe("VIDEO_CONSULTATION");
    expect(getRequiredFlagForRoute("/care/consultations")).toBe("VIDEO_CONSULTATION");
  });
  it("liefert null fuer nicht-gesundheits-routes", () => {
    expect(getRequiredFlagForRoute("/dashboard")).toBeNull();
    expect(getRequiredFlagForRoute("/care/tasks")).toBeNull();
  });
});
```

**Step 2: Test laufen lassen → FAIL**

`npm test -- --run lib/__tests__/health-feature-gate.test.ts`

**Step 3: Implementation**

```ts
// lib/health-feature-gate.ts
// Mapping Gesundheits-Routes → Feature-Flag-Keys. Quelle der Wahrheit fuer
// Middleware-Gate (proxy.ts) und UI-Kacheln (care hub).

export const HEALTH_ROUTES = [
  { prefix: "/care/medications", flag: "MEDICATIONS_ENABLED" },
  { prefix: "/care/aerzte", flag: "DOCTORS_ENABLED" },
  { prefix: "/care/appointments", flag: "APPOINTMENTS_ENABLED" },
  { prefix: "/care/sprechstunde", flag: "VIDEO_CONSULTATION" },
  { prefix: "/care/consultations", flag: "VIDEO_CONSULTATION" },
  { prefix: "/care/heartbeat", flag: "HEARTBEAT_ENABLED" },
  { prefix: "/care/checkin", flag: "HEARTBEAT_ENABLED" },
  { prefix: "/arzt", flag: "GDT_ENABLED" },
] as const;

export type HealthFlagKey =
  | "MEDICATIONS_ENABLED"
  | "DOCTORS_ENABLED"
  | "APPOINTMENTS_ENABLED"
  | "VIDEO_CONSULTATION"
  | "HEARTBEAT_ENABLED"
  | "GDT_ENABLED";

export function getRequiredFlagForRoute(pathname: string): HealthFlagKey | null {
  const match = HEALTH_ROUTES.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"),
  );
  return (match?.flag as HealthFlagKey) ?? null;
}

export function isHealthRoute(pathname: string): boolean {
  return getRequiredFlagForRoute(pathname) !== null;
}
```

**Step 4: Test laufen lassen → PASS**

**Step 5: Commit**

```bash
git add lib/health-feature-gate.ts lib/__tests__/health-feature-gate.test.ts
git commit -m "feat(feature-flags): add health-feature-gate route→flag mapping"
```

---

## Task 2: DB-Migration 170 für neue Flags (ROTE ZONE)

**Files:**
- Create: `supabase/migrations/170_health_feature_flags.sql`
- Create: `supabase/migrations/170_health_feature_flags.down.sql`

**Step 1: Migration schreiben**

```sql
-- 170_health_feature_flags.sql
-- Neue Gesundheits-Flags: MEDICATIONS_ENABLED und DOCTORS_ENABLED
-- Bestehende Flags (APPOINTMENTS_ENABLED, VIDEO_CONSULTATION, GDT_ENABLED,
-- HEARTBEAT_ENABLED) werden hier nicht angefasst.

insert into public.feature_flags (key, enabled, required_plans, description)
values
  ('MEDICATIONS_ENABLED', false, array['plus','pro'],
   'Medikamentenplan (Care)'),
  ('DOCTORS_ENABLED', false, array[]::text[],
   'Aerzte-Verzeichnis (Care)')
on conflict (key) do nothing;
```

**Step 2: Down-Migration**

```sql
-- 170_health_feature_flags.down.sql
delete from public.feature_flags
where key in ('MEDICATIONS_ENABLED','DOCTORS_ENABLED');
```

**Step 3: Auf Supabase-Branch testen (nicht Prod!)**

```bash
# Via MCP: claude_ai_Supabase create_branch + apply_migration
# Erwartung: 2 Zeilen in feature_flags, enabled=false
```

**Step 4: FOUNDER-GO einholen, dann auf Prod applizieren**

**Step 5: Commit (Migrations-Datei allein, kein Push)**

```bash
git add supabase/migrations/170_health_feature_flags.sql supabase/migrations/170_health_feature_flags.down.sql
git commit -m "feat(db): add MEDICATIONS_ENABLED + DOCTORS_ENABLED feature flags"
```

---

## Task 3: Flag-Cache für Middleware (Redis-Backed)

**Files:**
- Create: `lib/feature-flags-middleware-cache.ts`
- Test: `lib/__tests__/feature-flags-middleware-cache.test.ts`

**Rationale:** Proxy.ts läuft in Edge-Runtime. Supabase-Call pro Request ist zu teuer. 60-Sekunden-Cache in Redis (Upstash) reicht.

**Step 1: Test schreiben**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedisGet = vi.fn();
const mockRedisSetEx = vi.fn();

vi.mock("@/lib/redis", () => ({
  redis: { get: mockRedisGet, setex: mockRedisSetEx },
}));

const mockSupabaseFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ from: mockSupabaseFrom }),
}));

describe("getCachedFlagEnabled", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("liefert cached-Wert ohne DB-Call", async () => {
    mockRedisGet.mockResolvedValue("1");
    const { getCachedFlagEnabled } = await import("@/lib/feature-flags-middleware-cache");
    const res = await getCachedFlagEnabled("MEDICATIONS_ENABLED");
    expect(res).toBe(true);
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("faellt bei Cache-Miss auf DB zurueck + schreibt Cache", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockSupabaseFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: { enabled: true } }) }),
      }),
    });
    const { getCachedFlagEnabled } = await import("@/lib/feature-flags-middleware-cache");
    const res = await getCachedFlagEnabled("MEDICATIONS_ENABLED");
    expect(res).toBe(true);
    expect(mockRedisSetEx).toHaveBeenCalledWith(
      "ff:MEDICATIONS_ENABLED", 60, "1"
    );
  });
});
```

**Step 2: Test laufen lassen → FAIL**

**Step 3: Implementation**

```ts
// lib/feature-flags-middleware-cache.ts
import { redis } from "@/lib/redis";
import { createClient } from "@/lib/supabase/server";

const TTL_SECONDS = 60;

export async function getCachedFlagEnabled(flagKey: string): Promise<boolean> {
  if (process.env.NEXT_PUBLIC_PILOT_MODE === "true") return true;

  const cacheKey = `ff:${flagKey}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached === "1") return true;
    if (cached === "0") return false;
  } catch {
    // Cache-Fehler ignorieren, DB-Fallback
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", flagKey)
      .single();
    const enabled = data?.enabled === true;
    try {
      await redis.setex(cacheKey, TTL_SECONDS, enabled ? "1" : "0");
    } catch {}
    return enabled;
  } catch {
    return false;
  }
}
```

**Step 4: Test laufen → PASS**

**Step 5: Commit**

```bash
git add lib/feature-flags-middleware-cache.ts lib/__tests__/feature-flags-middleware-cache.test.ts
git commit -m "feat(feature-flags): add Redis-backed cache for middleware flag reads"
```

---

## Task 4: Proxy.ts Flag-aware machen

**Files:**
- Modify: `proxy.ts`
- Modify: `lib/legacy-routes.ts` — Health-Routes entfernen aus `LEGACY_ROUTE_PREFIXES`
- Test: `__tests__/proxy-health-flags.test.ts`

**Step 1: Test schreiben**

```ts
// __tests__/proxy-health-flags.test.ts
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/feature-flags-middleware-cache", () => ({
  getCachedFlagEnabled: vi.fn(),
}));
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(() => new Response("ok")),
}));
// weitere Mocks analog bestehendem proxy-test

import { getCachedFlagEnabled } from "@/lib/feature-flags-middleware-cache";
import { proxy } from "@/proxy";

describe("proxy Health-Flag-Gating", () => {
  it("redirectet /care/medications wenn MEDICATIONS_ENABLED=false", async () => {
    vi.mocked(getCachedFlagEnabled).mockResolvedValue(false);
    const req = new NextRequest("http://localhost/care/medications");
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/kreis-start");
  });

  it("laesst /care/medications durch wenn MEDICATIONS_ENABLED=true", async () => {
    vi.mocked(getCachedFlagEnabled).mockResolvedValue(true);
    const req = new NextRequest("http://localhost/care/medications");
    const res = await proxy(req);
    expect(res.status).not.toBe(307);
  });
});
```

**Step 2: Test laufen → FAIL**

**Step 3: `lib/legacy-routes.ts` bereinigen**

Health-Prefixes raus (sie werden jetzt flag-gegatet, nicht hart geblockt):

```ts
// Zeilen entfernen: /care/aerzte, /care/appointments, /care/consultations,
// /care/sprechstunde, /care/medications, /arzt
// (Heartbeat/Checkin waren nicht in der Legacy-Liste — hinzufuegen NICHT noetig,
// die regelt der Flag-Gate direkt.)
```

**Step 4: `proxy.ts` erweitern**

Nach dem `PUBLIC_PATHS`-Check, vor dem `isLegacyRoute()`-Check:

```ts
import { getRequiredFlagForRoute } from "@/lib/health-feature-gate";
import { getCachedFlagEnabled } from "@/lib/feature-flags-middleware-cache";

// Phase I: Gesundheits-Routes flag-gated
const healthFlag = getRequiredFlagForRoute(pathname);
if (healthFlag) {
  const enabled = await getCachedFlagEnabled(healthFlag);
  if (!enabled) {
    const url = request.nextUrl.clone();
    url.pathname = "/kreis-start";
    return NextResponse.redirect(url);
  }
  // Flag aktiv → normal weiter (Auth, Rate-Limit etc.)
}

// Bestehender Block (bleibt):
if (isLegacyRoute(pathname)) { ... }
```

**Step 5: Tests laufen → PASS**

**Step 6: Commit**

```bash
git add proxy.ts lib/legacy-routes.ts __tests__/proxy-health-flags.test.ts
git commit -m "feat(proxy): flag-aware gate for health routes"
```

---

## Task 5: Care-Hub-UI-Kacheln Flag-aware

**Files:**
- Modify: `app/(app)/care/page.tsx` (Care-Hub)
- Test: `__tests__/app/care/care-hub-flags.test.tsx`

**Step 1: Test schreiben** — render mit gemockten Flags, assert dass Kachel grau bei Flag=off, klickbar bei Flag=on.

**Step 2..4: Implementation + Test**

Per Tile:
```tsx
const { enabled: medicationsEnabled } = useFeatureFlag("MEDICATIONS_ENABLED", user);
<CareTile
  href="/care/medications"
  title="Medikamente"
  disabled={!medicationsEnabled}
  ...
/>
```

**Step 5: Commit**

```bash
git add app/\(app\)/care/page.tsx __tests__/app/care/care-hub-flags.test.tsx
git commit -m "feat(care-hub): Flag-aware tiles for health features"
```

---

## Task 6: Admin-UI neue Gruppe „Gesundheit"

**Files:**
- Modify: `app/(app)/admin/components/FeatureFlagManager.tsx`

**Step 1: Gruppe in `FLAG_GROUPS` einfügen (vor „Arzt-Portal")**

```ts
{
  title: "Gesundheit",
  pattern: /^(MEDICATIONS|DOCTORS|APPOINTMENTS|VIDEO_CONSULTATION|HEARTBEAT|GDT)/,
},
```

Bestehende „Arzt-Portal"-Gruppe kann entfernt werden (matcht dasselbe).

**Step 2: FLAG_DESCRIPTIONS ergänzen**

```ts
MEDICATIONS_ENABLED: "Medikamentenplan (Care)",
DOCTORS_ENABLED: "Aerzte-Verzeichnis (Care)",
HEARTBEAT_ENABLED: "Lebenszeichen / Check-in",
APPOINTMENTS_ENABLED: "Terminbuchung",
VIDEO_CONSULTATION: "Online-Sprechstunde",
GDT_ENABLED: "GDT-Schnittstelle (Arzt-Portal)",
```

**Step 3: Manueller Browser-Test** — /admin öffnen, Gruppe „Gesundheit" zeigt 6 Flags.

**Step 4: Commit**

```bash
git add app/\(app\)/admin/components/FeatureFlagManager.tsx
git commit -m "feat(admin): add Gesundheit flag group with descriptions"
```

---

## Task 7: Audit-Test — Tote Flags verhindern

**Files:**
- Create: `__tests__/lib/feature-flags-audit.test.ts`

**Step 1: Test schreiben**

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { globSync } from "glob";

const HEALTH_FLAGS = [
  "MEDICATIONS_ENABLED","DOCTORS_ENABLED","APPOINTMENTS_ENABLED",
  "VIDEO_CONSULTATION","HEARTBEAT_ENABLED","GDT_ENABLED",
];

describe("Feature-Flag-Audit (Gesundheit)", () => {
  const codeFiles = globSync("{lib,app,proxy.ts,modules}/**/*.{ts,tsx}", {
    ignore: ["**/node_modules/**","**/__tests__/**","**/*.test.ts","**/*.test.tsx"],
  });
  const allCode = codeFiles.map((f) => readFileSync(f, "utf8")).join("\n");

  it.each(HEALTH_FLAGS)("%s wird im Code ausgewertet", (flag) => {
    expect(allCode).toContain(flag);
  });
});
```

**Step 2: Test laufen → PASS (alle 6 Flags sind inzwischen verdrahtet)**

**Step 3: Commit**

```bash
git add __tests__/lib/feature-flags-audit.test.ts
git commit -m "test(feature-flags): guard against dead health flags"
```

---

## Task 8: End-to-End-Smoke-Test (manuell)

**Pre-Conditions:** Migration 170 auf Prod applied, Commits Task 1-7 lokal.

**Step 1: Alle Health-Flags auf OFF in Prod-DB** (falls nicht schon Default).

**Step 2: Als Thomas (plan=pro) einloggen.**
- `/care` aufrufen → 6 Gesundheits-Kacheln alle grau/disabled.
- `/care/medications` direkt in Adresszeile → Redirect auf `/kreis-start`.

**Step 3: In /admin `MEDICATIONS_ENABLED` auf ON, 70 s warten (Cache-TTL).**
- `/care/medications` direkt → lädt normal.
- `/care` → Kachel „Medikamente" klickbar.

**Step 4: Rückgängig — Flag OFF, 70 s warten, erneut testen.**

**Step 5: Ergebnis dokumentieren in `docs/plans/2026-04-19-handoff-gesundheits-flags.md`**

---

## Task 9: Push (ROTE ZONE)

**Step 1: FOUNDER-GO einholen**

**Step 2:**

```bash
git push origin master
```

**Step 3: Deploy auf Vercel beobachten** (Cron 3h oder manueller Trigger).

---

## Verifikations-Checkliste

- [ ] `npm test` grün (inkl. neuer Tests)
- [ ] `npx tsc --noEmit` keine neuen Fehler
- [ ] Migration 170 auf Prod applied (Founder-Go)
- [ ] /admin zeigt Gruppe „Gesundheit" mit 6 Flags
- [ ] Toggle MEDICATIONS_ENABLED → nach 60 s sichtbar in App
- [ ] Direkter URL-Aufruf bei Flag=off → Redirect
- [ ] Care-Hub-Kacheln reflektieren Flag-Status

---

## Rollback-Plan bei Bug

1. Alle 6 Flags auf OFF in Prod (`update feature_flags set enabled=false where key in (...)`).
2. Commit-Revert: `git revert <range>`.
3. Migration-Rückbau: `170_health_feature_flags.down.sql` auf Prod.
