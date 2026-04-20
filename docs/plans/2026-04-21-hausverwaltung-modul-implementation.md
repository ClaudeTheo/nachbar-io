# Hausverwaltungs-Modul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

---

## ⚠️ ERRATUM 2026-04-20 (nach A1-A7-Bau)

Dieser Plan-Text ist NICHT mehr die einzige Wahrheit. Drift-Punkte gegenueber dem real gebauten Code (`feature/hausverwaltung` HEAD `f8a3f03`):

1. **Mig-Nummerierung verschoben:** Geplant 175 / 178 / 176 / 177 → real **175 / 176 / 177 / 178** (housing_resident_links wurde 176 statt 178; report_category wurde noch nicht verteilt — Teil B). Plus **A2b unplanmaessig** (Mig 177 Feature-Flags + FeatureFlagManager Admin-Gruppe).
2. **A3-Pivot (Founder-Direktive 2026-04-20):** Schatten-Skip-Pfad VERWORFEN. Adresse ist immer Pflicht. Free-First wird ueber **PLZ-Auto-Quartier** (Mig 178: `quarters.auto_created` + `scope`) realisiert. Erster User pro PLZ wird automatisch `quarter_admin`. Schatten-Quartier (`SHADOW_QUARTER_ID`) bleibt nur als technischer Notfall-Fallback im Code, kein UI-Pfad mehr.
3. **Tor-Bedingung 3 verworfen:** „Hausverwalter-Email-Antwort" ist NICHT mehr Voraussetzung (Founder 2026-04-21 Abend). Default-Reihenfolge: **Maengel > Mitteilungen > Postfach > Termine**.
4. **Teil H ergaenzt (vor Teil B):** Bewohner laedt HV ein via Triple-Choice (mailto / Web-Share-API / PDF) — **anwaltsfrei, kein Resend-SMTP**. Mig 180 `housing_invitations`. Siehe Handoff `2026-04-20-handoff-housing-part-h-and-deploy.md`.
5. **A4+A5 als Block gebaut:** `detectNavRole` prueft `civic_members` zusaetzlich; `notifyCivicOrgStaff(civicOrgId, payload)` als neue Funktion (statt Refactor von `notifyOrgStaff` — vermeidet Breaking-Change).
6. **A6 minimal gefixt:** Voice-Tool `report_issue` schreibt jetzt nach `municipal_reports` (Welle 1, Mig 097). Housing-Routing per `target_org_id` kommt erst in Teil B1.
7. **A7 ergaenzt:** `lib/housing/feature-flags.ts` mit `useHousingFeature`-Hook + `isHousingFeatureEnabled`-Server-Util. Master×Teilfunktion-Logik (Teilfunktion false wenn Master false).

**Authoritative Quelle ab Part A:** [memory/topics/housing.md](../../../memory/topics/housing.md) (vom Founder gepflegt, mit allen Commits + Tests).

Der Rest dieses Plan-Files bleibt nuetzlich fuer Teile B-G (TDD-Pattern, RLS-Policy-Skizzen). Bei Konflikt zwischen Plan und Code gewinnt der Code (siehe `.claude/rules/pre-check.md`).

---

**Goal:** Free-first Bewohner-App mit optionalem Hausverwaltungs-Layer bauen — 4 Funktionen (Maengel, Mitteilungen, Postfach, Termine) als civic-Adaption, ohne neue Org-Welt, mit Senior-Modus.

**Architecture:** 5 Migrationen (175-179) + Adaption bestehender civic-Bausteine. HV lebt in `civic_organizations.type='housing'`. Bewohner wird ueber `housing_resident_links` verknuepft. Cockpit unter `app/(app)/org/housing/*`. Bewohner-UI unter `app/(app)/hausverwaltung/*`. Dashboard-Kachel an 4 Stellen hart eingehaengt.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4, shadcn/ui, Supabase (EU Frankfurt, RLS), OpenAI TTS (gpt-4o-mini-tts), Voice-Pipeline, Vitest, Playwright.

**Design-Referenz:** `docs/plans/2026-04-21-hausverwaltung-modul-design.md` (Commit `70499e6`)

**Tor-Bedingungen vor Start (urspruenglich, Erratum oben beachten):**
1. Welle-C-Push live
2. GmbH-Eintragung (Notar 27.04.) + AVV Anthropic/Mistral unterschrieben
3. ~~Hausverwalter-Email-Antwort~~ — VERWORFEN (Founder 2026-04-21)

**Kein Push waehrend Implementation.** Jede Migration: File-first, lokaler Commit, DANN Prod-Apply mit Founder-Go. RLS-Policies idempotent (`DO`-Block mit `pg_policies`-Lookup).

---

## Teil A — Fundament (Email-unabhaengig, muss zuerst)

Reihenfolge fix: A0 → A1 → A2 → A3 → A4 → A5 → A6. Keine Parallelitaet.

### Task A0: Onboarding-Drift `quarter_memberships` klaeren (Pre-Check, kein Code)

**Files:**
- Read: `modules/onboarding/components/OnboardingFlow.tsx`
- Read: `supabase/migrations/*` (Search `quarter_memberships`)

**Step 1: Grep nach `quarter_memberships`**

Run: `grep -rn "quarter_memberships" --include="*.ts" --include="*.tsx" --include="*.sql" .`

**Step 2: Entscheiden**

- Wenn Tabelle NICHT existiert, aber im Code referenziert: als tote Referenz markieren, Task A0-fix hinzufuegen
- Wenn Tabelle existiert: Scope-Check, ob sie fuer F1 relevant ist

**Step 3: Befund in `docs/plans/2026-04-21-hausverwaltung-modul-implementation.md` als Kommentar ergaenzen**

Kein Commit, nur Vorbereitung.

---

### Task A1: Migration 175 — Schatten-Quartier + Type-Doku

**Files:**
- Create: `supabase/migrations/175_housing_foundation.sql`
- Create: `supabase/migrations/175_housing_foundation.down.sql`
- Test: `__tests__/migrations/175_housing_foundation.test.ts`

**Step 1: Write failing integration test**

```typescript
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";

describe("Mig 175: Schatten-Quartier + Housing-Type", () => {
  it("Schatten-Quartier 'Offenes Quartier Deutschland' existiert mit fixer UUID", async () => {
    const sb = createAdminClient();
    const { data } = await sb
      .from("quarters")
      .select("id, name")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();
    expect(data?.name).toBe("Offenes Quartier Deutschland");
  });

  it("civic_organizations kann type='housing' aufnehmen", async () => {
    const sb = createAdminClient();
    const { error } = await sb.from("civic_organizations").insert({
      name: "Test-HV 175",
      type: "housing",
      municipality: "Bad Saeckingen",
    });
    expect(error).toBeNull();
    // Cleanup
    await sb.from("civic_organizations").delete().eq("name", "Test-HV 175");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd nachbar-io && npm run test -- __tests__/migrations/175`
Expected: FAIL (Quartier existiert nicht, civic_organizations.type evtl. mit Check-Constraint)

**Step 3: Write migration**

```sql
-- Migration 175: Hausverwaltungs-Fundament
-- - Schatten-Quartier "Offenes Quartier Deutschland" fuer Free-first
-- - civic_organizations.type='housing' dokumentieren (Check besteht bereits als freier text)
-- - organizations.org_type='housing' als deprecated markieren (Doku, kein Drop)

BEGIN;

-- Schatten-Quartier fuer Bewohner ohne HV-Verknuepfung und ohne echte Quartier-Wahl
INSERT INTO quarters (id, name, slug, state, country, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Offenes Quartier Deutschland',
  'offenes-quartier-de',
  'DE',
  'DE',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Hinweis-Kommentar fuer Devs
COMMENT ON TABLE quarters IS 'Enthaelt Pilot-Quartiere und Schatten-Quartier "Offenes Quartier Deutschland" (UUID 0000...0001) fuer Free-first-Bewohner ohne HV-Verknuepfung.';

COMMENT ON COLUMN civic_organizations.type IS 'Erlaubte Werte: kommune, pflege, housing, sonstiges. "housing" = Hausverwaltung fuer HV-Modul.';

COMMENT ON COLUMN organizations.org_type IS 'DEPRECATED Wert: "housing". Ab Mig 175 wird HV in civic_organizations mit type="housing" gefuehrt. Alte Werte nicht drop-en (Historie).';

COMMIT;
```

**Step 4: Run test to verify it passes**

Run: `cd nachbar-io && npm run test -- __tests__/migrations/175`
Expected: PASS

**Step 5: Write down-migration**

```sql
-- Down 175
BEGIN;
DELETE FROM quarters WHERE id = '00000000-0000-0000-0000-000000000001';
COMMIT;
```

**Step 6: Commit (lokal, nicht angewendet)**

```bash
git add supabase/migrations/175_housing_foundation.sql supabase/migrations/175_housing_foundation.down.sql __tests__/migrations/175_housing_foundation.test.ts
git commit -m "feat(housing): add shadow quarter + type docs (mig 175, file-first)"
```

**Step 7: Prod-Apply (Founder-Go, Rote Zone)**

Nur nach expliziter Founder-Freigabe: Mig via Supabase MCP `apply_migration`. Danach Insert in `schema_migrations` verifizieren.

---

### Task A2: Migration 178 — `housing_resident_links`

**Files:**
- Create: `supabase/migrations/178_housing_resident_links.sql`
- Create: `supabase/migrations/178_housing_resident_links.down.sql`
- Test: `__tests__/migrations/178_housing_resident_links.test.ts`

**Step 1: Failing test**

```typescript
describe("Mig 178: housing_resident_links", () => {
  it("Bewohner sieht eigenen Link", async () => {
    // Setup: 1 civic_org, 1 household, 1 link
    // Assert: Bewohner-Client (RLS) findet Link
  });
  it("Bewohner sieht fremde Links NICHT", async () => {});
  it("civic_members sehen Links der eigenen Org", async () => {});
});
```

**Step 2: Run to fail**

Run: `npm run test -- __tests__/migrations/178`
Expected: FAIL (Tabelle nicht da)

**Step 3: Migration**

```sql
-- Migration 178: Verknuepfung Bewohner <-> Hausverwaltung
-- Kein org_members-Eintrag, sondern eigene Assignment-Tabelle (Vorbild: 132_pflege_resident_assignments)

CREATE TABLE IF NOT EXISTS housing_resident_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  civic_org_id UUID NOT NULL REFERENCES civic_organizations(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_by UUID NOT NULL REFERENCES auth.users(id),
  linked_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ NULL,
  UNIQUE(civic_org_id, household_id)
);

CREATE INDEX IF NOT EXISTS idx_hrl_household ON housing_resident_links(household_id);
CREATE INDEX IF NOT EXISTS idx_hrl_civic_org ON housing_resident_links(civic_org_id);
CREATE INDEX IF NOT EXISTS idx_hrl_user ON housing_resident_links(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE housing_resident_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='housing_resident_links' AND policyname='hrl_select_resident') THEN
    CREATE POLICY "hrl_select_resident" ON housing_resident_links
      FOR SELECT USING (
        user_id = auth.uid()
        OR household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='housing_resident_links' AND policyname='hrl_select_staff') THEN
    CREATE POLICY "hrl_select_staff" ON housing_resident_links
      FOR SELECT USING (
        civic_org_id IN (SELECT org_id FROM civic_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='housing_resident_links' AND policyname='hrl_insert_staff') THEN
    CREATE POLICY "hrl_insert_staff" ON housing_resident_links
      FOR INSERT WITH CHECK (
        linked_by = auth.uid()
        AND civic_org_id IN (
          SELECT org_id FROM civic_members
          WHERE user_id = auth.uid() AND role IN ('admin','editor')
        )
      );
  END IF;
END $$;
```

**Step 4: Tests passen**

Run: `npm run test -- __tests__/migrations/178`
Expected: PASS

**Step 5: Down-Migration + Commit + Apply (analog Task A1)**

---

### Task A3: Schatten-Quartier Registration-Skip (F1)

**Files:**
- Modify: `app/(auth)/register/components/RegisterStepAddress.tsx`
- Modify: `app/(auth)/register/components/RegisterStepIdentity.tsx`
- Modify: `lib/services/registration.service.ts` (`completeRegistration`)
- Modify: `lib/services/household.service.ts`
- Modify: `modules/onboarding/components/OnboardingFlow.tsx` (falls A0-Fix noetig)
- Create: `lib/quarter-shadow.ts` (Konstanten + Helfer)
- Test: `__tests__/services/registration.shadow-quarter.test.ts`

**Step 1: Create helper**

```typescript
// lib/quarter-shadow.ts
export const SHADOW_QUARTER_ID = "00000000-0000-0000-0000-000000000001";

export function isShadowQuarter(quarterId: string | null | undefined): boolean {
  return quarterId === SHADOW_QUARTER_ID;
}

export function quarterDisplayName(quarterId: string, realName: string): string {
  return isShadowQuarter(quarterId) ? "Ohne Quartier" : realName;
}
```

**Step 2: Failing test**

```typescript
describe("completeRegistration — Schatten-Quartier-Fallback", () => {
  it("setzt quarter_id auf SHADOW_QUARTER_ID wenn User 'Skip'", async () => {
    const result = await completeRegistration({ ...input, quarterId: null });
    expect(result.household.quarter_id).toBe(SHADOW_QUARTER_ID);
  });
  it("behaelt echtes Quartier bei Auswahl", async () => {});
});
```

**Step 3: Run to fail, implement, pass**

Pattern:

```typescript
// lib/services/registration.service.ts (relevante Aenderung)
import { SHADOW_QUARTER_ID } from "@/lib/quarter-shadow";

export async function completeRegistration(input: RegisterInput) {
  const quarterId = input.quarterId ?? SHADOW_QUARTER_ID;
  const household = await createHousehold({ ...input, quarter_id: quarterId });
  // ... Rest unveraendert
}
```

**Step 4: UI-Skip-Option**

```tsx
// RegisterStepAddress.tsx — "Ohne Quartier fortfahren"-Button ergaenzen
<Button variant="ghost" onClick={() => onSkip()}>
  Ich habe kein Quartier / ueberspringen
</Button>
```

`onSkip` setzt `quarterId=null`, Flow laeuft weiter, Service setzt Shadow.

**Step 5: UI-Maskierung**

```tsx
// QuarterProvider / alle Stellen, die quarter.name anzeigen
import { quarterDisplayName } from "@/lib/quarter-shadow";
const display = quarterDisplayName(quarter.id, quarter.name);
```

**Step 6: Commit**

```bash
git add <files>
git commit -m "feat(housing): add shadow-quarter fallback for free-first registration (F1)"
```

---

### Task A4: civic-aware Nav + Org-API (F6)

**Files:**
- Modify: `components/nav/NavConfig.ts`
- Modify: `app/api/organizations/route.ts`
- Modify: `modules/admin/services/organizations.service.ts`
- Test: `__tests__/nav/nav-config.civic-aware.test.ts`

**Step 1: Failing test**

```typescript
describe("NavConfig — civic-aware fuer Housing-Staff", () => {
  it("User in civic_organizations type='housing' sieht HV-Cockpit-Nav", async () => {
    const nav = await buildNavConfig(userWithHousingMembership);
    expect(nav.items.map(i => i.href)).toContain("/org/housing");
  });
});
```

**Step 2/3: Implementation**

```typescript
// components/nav/NavConfig.ts — Teil-Skizze
export async function buildNavConfig(user: User): Promise<NavConfig> {
  // Alt: nur organizations/org_members
  // Neu: beide Welten pruefen
  const orgMemberships = await getOrgMembershipsDual(user.id);
  const items = [];
  if (orgMemberships.organizations.length > 0) items.push(...orgNavItems);
  if (orgMemberships.civicHousing.length > 0) items.push({
    href: "/org/housing",
    label: "Hausverwaltung",
    icon: "Building",
  });
  return { items };
}
```

**Step 4: Commit**

```bash
git commit -m "feat(housing): civic-aware nav for housing cockpit (F6)"
```

---

### Task A5: civic-aware `notifyOrgStaff()` (F9)

**Files:**
- Modify: `lib/push-delivery.ts` (`notifyOrgStaff`)
- Test: `__tests__/push/notify-org-staff.civic.test.ts`

**Step 1: Failing test**

```typescript
describe("notifyOrgStaff — civic_organizations support", () => {
  it("pusht an civic_members wenn civicOrgId uebergeben", async () => {});
  it("pusht an org_members wenn orgId uebergeben", async () => {});
  it("pusht nicht doppelt, wenn User in beiden Welten", async () => {});
});
```

**Step 2/3: Implementation**

```typescript
// lib/push-delivery.ts
export async function notifyOrgStaff(
  opts: { orgId?: string; civicOrgId?: string; payload: PushPayload }
): Promise<void> {
  const staffUserIds = new Set<string>();

  if (opts.orgId) {
    const { data } = await sb
      .from("org_members")
      .select("user_id")
      .eq("org_id", opts.orgId);
    data?.forEach(r => staffUserIds.add(r.user_id));
  }

  if (opts.civicOrgId) {
    const { data } = await sb
      .from("civic_members")
      .select("user_id")
      .eq("org_id", opts.civicOrgId);
    data?.forEach(r => staffUserIds.add(r.user_id));
  }

  await Promise.all([...staffUserIds].map(uid => pushToUser(uid, opts.payload)));
}
```

**Step 4: Commit**

```bash
git commit -m "feat(housing): notifyOrgStaff supports civic_organizations (F9)"
```

---

### Task A6: Voice-Tool-Executor `issue_reports`-Fix

**Files:**
- Modify: `modules/voice/services/tool-executor.ts`
- Test: `__tests__/voice/tool-executor.housing.test.ts`

**Step 1: Grep existing**

Run: `grep -n "issue_reports" modules/voice/services/tool-executor.ts`
Erwartung: Referenz auf Tabelle, die nicht existiert.

**Step 2: Entscheidung**

- (a) Umleiten auf `municipal_reports` (mit target_org_id, wenn Housing-Kontext)
- (b) Neue Funktion `submitHousingReport` einziehen

Empfehlung (a) wenn Tool-Executor schon struct-Input hat, sonst (b).

**Step 3: Implementation**

```typescript
// modules/voice/services/tool-executor.ts
async function submitReport(args: { category: string; description: string; housing?: boolean; photoUrl?: string }) {
  const targetOrgId = args.housing
    ? await resolveResidentHousingOrg(userId)  // aus housing_resident_links
    : null;
  await sb.from("municipal_reports").insert({
    user_id: userId,
    quarter_id: targetOrgId ? SHADOW_QUARTER_ID : currentQuarterId,
    category: args.category,
    description: args.description,
    target_org_id: targetOrgId,
    photo_url: args.photoUrl,
  });
}
```

**Step 4: Test + Commit**

```bash
git commit -m "fix(voice): route issue_reports to municipal_reports with housing target"
```

---

## Teil B — Funktion 1: Maengelmeldung

**Priorisierung:** Reihenfolge B/C/D/E haengt von Email-Antwort ab. Default-Annahme: B zuerst (haeufigste HV-Last).

### Task B1: Migration 176 — `report_category` erweitern + `target_org_id`

**Files:**
- Create: `supabase/migrations/176_housing_report_category_expand.sql`
- Create: `supabase/migrations/176_housing_report_category_expand.down.sql`
- Test: `__tests__/migrations/176_report_category.test.ts`

**Step 1: Failing test**

```typescript
describe("Mig 176", () => {
  it("report_category akzeptiert 'heating'", async () => {
    const { error } = await sb.from("municipal_reports").insert({
      user_id: u, quarter_id: SHADOW_QUARTER_ID, category: "heating",
      target_org_id: hvOrgId,
    });
    expect(error).toBeNull();
  });
  it("target_org_id NULL ist Quartier-Mangel (RLS wie bisher)", async () => {});
  it("target_org_id gesetzt ist Housing-Mangel (neue RLS)", async () => {});
});
```

**Step 2: Migration**

```sql
-- Migration 176: report_category erweitern + target_org_id
BEGIN;

ALTER TYPE report_category ADD VALUE IF NOT EXISTS 'heating';
ALTER TYPE report_category ADD VALUE IF NOT EXISTS 'water';
ALTER TYPE report_category ADD VALUE IF NOT EXISTS 'electrical';
ALTER TYPE report_category ADD VALUE IF NOT EXISTS 'elevator';
ALTER TYPE report_category ADD VALUE IF NOT EXISTS 'noise';
ALTER TYPE report_category ADD VALUE IF NOT EXISTS 'common_area';
ALTER TYPE report_category ADD VALUE IF NOT EXISTS 'mailbox';
ALTER TYPE report_category ADD VALUE IF NOT EXISTS 'other_housing';

ALTER TABLE municipal_reports
  ADD COLUMN IF NOT EXISTS target_org_id UUID NULL REFERENCES civic_organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_municipal_reports_target_org
  ON municipal_reports(target_org_id) WHERE target_org_id IS NOT NULL;

-- RLS: bestehende Policies lassen; neue fuer Housing ergaenzen
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='municipal_reports' AND policyname='housing_reports_insert') THEN
    CREATE POLICY "housing_reports_insert" ON municipal_reports
      FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND target_org_id IN (
          SELECT civic_org_id FROM housing_resident_links
          WHERE (user_id = auth.uid() OR household_id IN (
            SELECT household_id FROM household_members WHERE user_id = auth.uid()
          ))
          AND revoked_at IS NULL
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='municipal_reports' AND policyname='housing_reports_select_staff') THEN
    CREATE POLICY "housing_reports_select_staff" ON municipal_reports
      FOR SELECT USING (
        target_org_id IS NOT NULL
        AND target_org_id IN (SELECT org_id FROM civic_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='municipal_reports' AND policyname='housing_reports_update_staff') THEN
    CREATE POLICY "housing_reports_update_staff" ON municipal_reports
      FOR UPDATE USING (
        target_org_id IS NOT NULL
        AND target_org_id IN (
          SELECT org_id FROM civic_members
          WHERE user_id = auth.uid() AND role IN ('admin','editor')
        )
      );
  END IF;
END $$;

COMMIT;
```

**Step 3: Commit + Apply (Founder-Go)**

### Task B2: App-Typen + Konstanten erweitern

**Files:**
- Modify: `lib/municipal/types.ts` — `ReportCategory`-Typ
- Modify: `lib/municipal/constants.ts` — Labels + Gruppen

**Step 1:** Typ-Erweiterung

```typescript
export type ReportCategory =
  | "street" | "lighting" | "greenery" | "waste" | "vandalism" | "other"
  | "heating" | "water" | "electrical" | "elevator" | "noise"
  | "common_area" | "mailbox" | "other_housing";

export const QUARTIER_CATEGORIES: ReportCategory[] = ["street","lighting","greenery","waste","vandalism","other"];
export const HOUSING_CATEGORIES: ReportCategory[] = ["heating","water","electrical","elevator","noise","common_area","mailbox","other_housing"];
```

**Step 2:** Labels in `constants.ts`

```typescript
export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  // ... bestehende
  heating: "Heizung / Warmwasser",
  water: "Wasser / Sanitaer",
  electrical: "Elektrik / Strom",
  elevator: "Aufzug",
  noise: "Laerm",
  common_area: "Gemeinschaftsflaeche",
  mailbox: "Briefkasten / Post",
  other_housing: "Sonstiges (Haus)",
};
```

**Step 3: Commit**

```bash
git commit -m "feat(housing): extend report category types/labels"
```

### Task B3: API `/api/hausverwaltung/reports/*`

**Files:**
- Create: `app/api/hausverwaltung/reports/route.ts` (POST = create, GET = list)
- Create: `app/api/hausverwaltung/reports/[id]/route.ts` (PATCH = status)
- Test: `__tests__/api/hausverwaltung/reports.test.ts`

**Step 1: Failing test**

```typescript
describe("POST /api/hausverwaltung/reports", () => {
  it("Bewohner mit housing_resident_link kann Meldung erstellen", async () => {});
  it("Bewohner ohne Link bekommt 403", async () => {});
});

describe("PATCH /api/hausverwaltung/reports/[id]", () => {
  it("HV-Staff (civic_members admin) kann Status aendern", async () => {});
  it("Bewohner kann Status NICHT aendern", async () => {});
});
```

**Step 2/3: Implementation**

Pattern: Supabase-Client, RLS prueft selbststaendig. `POST` validiert `target_org_id` gegen `housing_resident_links`.

**Step 4: Commit**

```bash
git commit -m "feat(housing): API routes for maintenance reports (B)"
```

### Task B4: Bewohner-UI `app/(app)/hausverwaltung/meldung/new/page.tsx`

**Files:**
- Create: `app/(app)/hausverwaltung/meldung/new/page.tsx` (Senior-tauglich, 80px Touch-Targets)
- Create: `modules/hausverwaltung/components/CategoryTiles.tsx`
- Create: `modules/hausverwaltung/components/VoicePhotoCapture.tsx` (reuse Voice-Pipeline)
- Test: `__tests__/app/hausverwaltung/meldung-new.test.tsx`

**Step 1: Failing test (React Testing Library)**

```tsx
import { render, cleanup } from "@testing-library/react";
afterEach(cleanup);

it("Senior sieht 8 grosse Kategorie-Kacheln (Housing)", () => {
  const { getAllByRole } = render(<MeldungNewPage />);
  const tiles = getAllByRole("button", { name: /Heizung|Wasser/ });
  expect(tiles.length).toBeGreaterThanOrEqual(2);
  tiles.forEach(t => expect(t).toHaveStyle("min-height: 80px"));
});
```

**Step 2/3: UI-Skeleton**

```tsx
// app/(app)/hausverwaltung/meldung/new/page.tsx
"use client";
export default function MeldungNewPage() {
  const [category, setCategory] = useState<ReportCategory|null>(null);
  const [photo, setPhoto] = useState<File|null>(null);
  const [voiceText, setVoiceText] = useState("");
  // ...
  return (
    <main className="mx-auto max-w-md p-4 space-y-6">
      <h1 className="text-3xl font-bold">Etwas ist kaputt?</h1>
      <CategoryTiles selected={category} onSelect={setCategory} categories={HOUSING_CATEGORIES} />
      {category && (
        <>
          <VoicePhotoCapture onVoice={setVoiceText} onPhoto={setPhoto} />
          <Button className="min-h-[80px] w-full text-2xl" onClick={submit}>
            Abschicken
          </Button>
        </>
      )}
    </main>
  );
}
```

**Step 4: Commit**

```bash
git commit -m "feat(housing): resident UI for maintenance report (senior-mode)"
```

### Task B5: Cockpit-UI `app/(app)/org/housing/reports/page.tsx`

**Files:**
- Create: `app/(app)/org/housing/layout.tsx` (civic-Auth-Guard)
- Create: `app/(app)/org/housing/page.tsx` (Uebersicht)
- Create: `app/(app)/org/housing/reports/page.tsx` (Liste)
- Create: `app/(app)/org/housing/reports/[id]/page.tsx` (Detail + Status-Aenderung)
- Test: `e2e/housing-cockpit.spec.ts` (Playwright)

**Step 1: E2E-Test-Skizze**

```typescript
test("HV-Staff sieht offene Meldungen, kann Status aendern", async ({ page }) => {
  await page.goto("/org/housing/reports");
  await expect(page.getByRole("row")).toHaveCount(3);
  await page.getByRole("row").nth(0).click();
  await page.getByRole("button", { name: "In Arbeit" }).click();
  // Assert status badge changed
});
```

**Step 2/3: Komponenten-Skeleton mit shadcn/ui Table + Dialog**

**Step 4: Commit**

```bash
git commit -m "feat(housing): cockpit UI for maintenance reports"
```

---

## Teil C — Funktion 2: Hausmitteilungen (analog B, kuerzer dokumentiert)

### Task C1: `municipal_announcements` — target_org_id ergaenzen

**Files:** Neue Migration mit analoger Struktur zu B1. `ALTER TABLE municipal_announcements ADD COLUMN target_org_id UUID NULL REFERENCES civic_organizations(id)` + RLS-Policies target-aware.

### Task C2: Lesebestaetigung-Tabelle

```sql
CREATE TABLE IF NOT EXISTS housing_announcement_reads (
  announcement_id UUID REFERENCES municipal_announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);
```

### Task C3-C5: API + Bewohner-UI + Cockpit-UI (Pattern wie B3-B5)

---

## Teil D — Funktion 3: Dokumenten-Postfach

### Task D1: `civic_messages` fuer Housing nutzen

`civic_messages` + `civic_message_attachments` existieren bereits (Mig 146/149). Keine neue Tabelle, nur:
- Nachrichtentyp `'housing_document'` in ENUM oder text-Feld
- RLS aktualisieren (civic_org_id + housing_resident_links)

### Task D2-D4: API + Bewohner-UI + Cockpit-Upload

---

## Teil E — Funktion 4: Termine

### Task E1: Migration 177 — `civic_appointments` erweitern

**Files:**
- Create: `supabase/migrations/177_civic_appointments_housing.sql`
- Down + Test analog

```sql
ALTER TABLE civic_appointments
  ADD COLUMN IF NOT EXISTS civic_org_id UUID NULL REFERENCES civic_organizations(id),
  ADD COLUMN IF NOT EXISTS household_id UUID NULL REFERENCES households(id),
  ADD COLUMN IF NOT EXISTS category TEXT NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID NULL REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'vorgeschlagen'
    CHECK (status IN ('vorgeschlagen','bestaetigt','verschoben','erledigt'));

CREATE INDEX IF NOT EXISTS idx_civic_appointments_civic_org ON civic_appointments(civic_org_id);
CREATE INDEX IF NOT EXISTS idx_civic_appointments_household ON civic_appointments(household_id);
CREATE INDEX IF NOT EXISTS idx_civic_appointments_reminder ON civic_appointments(reminder_at) WHERE reminder_at IS NOT NULL;

-- RLS target-aware wie bei reports
```

### Task E2-E4: API + Bewohner-Kalender + Cockpit-Anlage

### Task E5: Reminder-Cron

**Files:**
- Create: `app/api/cron/housing-reminders/route.ts`
- Vercel-Cron in `vercel.json` eintragen (15-min-Takt)

Pattern: Query `civic_appointments` mit `reminder_at <= now() AND reminder_sent_at IS NULL`, sende Push, setze `reminder_sent_at`. (Neue Spalte ergaenzen in E1.)

---

## Teil F — Kachel-Einhaengung

### Task F1: `components/dashboard/QuickActions.tsx`

**Step 1: Conditional-Check**

```tsx
const { data: link } = useHousingResidentLink();
if (link) quickActions.push({ href: "/hausverwaltung", icon: Building, label: "Hausverwaltung" });
```

### Task F2: `components/dashboard/DiscoverGrid.tsx` — analog
### Task F3: `app/(senior)/kreis-start/page.tsx` — analog
### Task F4: `app/senior/home/page.tsx` — analog

### Task F5: E2E-Test "Kachel in beiden Senior-Startseiten identisch"

```typescript
test("HV-Kachel auf /kreis-start und /senior/home identisch", async ({ page }) => {
  // Beide Routen besuchen, beide Kacheln finden, Label/Href vergleichen
});
```

**Commit:**
```bash
git commit -m "feat(housing): hardwire HV tile on 4 dashboard surfaces (F8)"
```

---

## Teil G — Finalisierung

### Task G1: Landing unter `app/(app)/hausverwaltung/page.tsx`

Bewohner-Uebersicht mit 4 Kacheln (Maengel / Mitteilungen / Briefe / Termine), jeweils Badge mit ungelesen/offen.

### Task G2: TTS-Privatpfad fuer sensitive Texte

**Files:** Neue Funktion in `lib/tts-private.ts`:
- KEINE Cache-Nutzung
- Direktaufruf OpenAI, Response direkt zurueck
- Dokumentation: "NIEMALS fuer Standardphrasen. NUR fuer Brief-Inhalt, Mieter-Namen, persoenliche Mitteilungen."

### Task G3: E2E Happy Path

**Files:**
- `e2e/housing-happy-path.spec.ts`

Test: Bewohner registriert sich → Hausverwalter linkt → Bewohner meldet Mangel → Cockpit sieht → Status-Update → Push an Bewohner → Kalender zeigt Termin.

### Task G4: Release-Notes + Doku

**Files:**
- Create: `docs/plans/2026-04-XX-release-notes-housing.md`
- Modify: `docs/04_FUNKTIONSMODULE.md` — Hausverwaltungs-Kapitel
- Modify: `docs/08_DATENMODELL.md` — neue Tabellen + Spalten

### Task G5: TypeScript-Check + Volltest-Lauf

```bash
cd nachbar-io
npx tsc --noEmit           # erwartet: 0 Errors
npm run test               # erwartet: 0 failed
npm run test:e2e           # erwartet: 0 failed
```

### Task G6: Founder-Walkthrough

Gemeinsam mit Founder:
1. Bewohner-Registration mit Skip
2. Hausverwalter-Cockpit
3. Maengelmeldung per Voice + Foto
4. Status-Aenderung, Push kommt
5. Termin anlegen, Mieter bestaetigt

---

## Open Questions / Vor-Fragen (vor jedem Task loesen)

| # | Frage | Wer entscheidet | Wann |
|---|---|---|---|
| OQ1 | `quarter_memberships`-Drift in OnboardingFlow — tot oder vergessen? | Founder | Vor A3 |
| OQ2 | `notifications`-Constraint erweitern oder Type `system` wiederverwenden? | Founder | Vor A5 oder C3 |
| OQ3 | Bewohner-UI `/hausverwaltung` — Senior-Modus identisch zu `/senior/home` oder eigenes Layout? | Founder | Vor B4 |
| OQ4 | Voice-Tool-Executor: `submitReport`-Refactor (Option a) oder neuer Tool-Name (Option b)? | Codex-Review oder Claude-Default | Vor A6 |
| OQ5 | Priorisierung B/C/D/E | Hausverwalter-Email-Antwort | Vor B1 |

---

## Execution Constraints

- **Kein Push** bis Welle-C-Push durch + Implementation komplett + Founder-Go.
- **Jede Migration:** File-first (lokal commit), DANN Prod-Apply nach expliziter Founder-Freigabe.
- **TDD pflicht:** RED → GREEN → Commit. Keine Ausnahmen bei neuen Features.
- **Ein-Schritt-Regel:** eine Teilaufgabe auf einmal. Nach jeder Task verifizieren (`ls`/`cat`/`npm test`).
- **Test-Cleanup:** jede neue React-Testing-Library-Test-Datei bekommt `afterEach(cleanup)` (Memory `feedback_test_cleanup_default`).
- **DSGVO:** keine Adressdaten im Client-State, nur household_id. Sensitive Felder per AES.
- **Sprache:** Code-Kommentare Deutsch, Variablen/Funktionen Englisch, UI Deutsch (Siezen).

---

## Plan complete. Execution options:

**1. Subagent-Driven (this session)** — nicht geeignet. Tor-Bedingungen (Welle-C-Push, GmbH/AVV, Email-Antwort) sind noch offen. Dispatch waere Trockenlauf ohne Prod-Apply-Moeglichkeit.

**2. Parallel Session (separate)** — nach Tor-Bedingungen: neue Session mit `superpowers:executing-plans` auf diesen Plan als Input.

**Empfehlung:** **Option 2 nach Tor-Erfuellung.** Vorher: diesen Plan archivieren, Founder-Email rausschicken, Welle-C-Push abwarten, GmbH + AVV erledigen. Sobald alle drei Tore gruen: neue Session, Plan ausfuehren.
