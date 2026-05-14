# Pilot Family Code Operationalisierung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pilot 0 bekommt eine druck- und supportfaehige Code-Logik fuer Hausnummern, Ersatzcodes, Bewohner-Einladungen, Eltern/Kinder, Senioren/Angehoerige und Admin-Scope, ohne Prod-Write, Deploy, Push, Zahlungssystem oder Job-Marktplatz.

**Architecture:** Bestehende Family-QR-Infrastruktur bleibt fuer Eltern/Kinder und Senior/Angehoerige fuehrend. Neue Pilot-Hausnummer-Codes werden als eigene, haushaltsgebundene Code-Inventar-Tabelle neben `households.invite_code` eingefuehrt, weil `households` nur einen Code pro Adresse abbildet und `invite_codes`/`neighbor_invitations` keine robuste Hausnummer-Code-Verwaltung liefern. Admin-UI und Druckansicht lesen nur serverseitig gefilterte Pilotdaten; der Client bekommt keine fremden Adressdaten ausser im Admin-Kontext.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase Postgres/RLS, shadcn/ui, Tailwind v4, Vitest, bestehende `generateSecureCode`/`formatCode`, bestehende Family-Setup-Services.

---

## Current Code Reality

Bestehende, nicht duplizieren:

- `lib/family-setup/*`: kurzlebige QR-/Kurzcode-Flows fuer `child_direct`, `child_friend`, `senior_setup`.
- `supabase/migrations/197_family_setup_invitations.sql`: Family-Setup-Tabellen und additive `caregiver_links`-Felder.
- `app/api/family-setup/*` und `modules/family-setup/components/*`: Setup-Erstellung und Claim-Seite.
- `households.invite_code`: aktueller Brief-/Hausnummer-Code, aber nur ein Code pro Haushalt und ohne Claim-Status.
- `neighbor_invitations`: persoenliche Bewohner-Einladungen mit Status, aber nicht fuer initiale Briefkontingente pro Hausnummer modelliert.
- `invite_codes`: legacy Profil-Code; wird im Profil erzeugt, aber `checkInviteCode` nutzt ihn nicht fuer Registrierung. Nicht fuer Pilot-Briefcodes verwenden, bis separat bereinigt.
- `app/api/pilot/households` und `lib/services/pilot.service.ts`: einfache Drucklisten-API, aktuell nur `households.invite_code`.
- `app/(app)/admin/components/InviteCodeManager.tsx` und `HouseholdManagement.tsx`: Admin-Basics vorhanden, aber keine Codekontingente/Ersatzcodes/Family-Setup-Queue.

## Founder Decisions Before Build

Thomas muss vor Umsetzung drei Punkte entscheiden:

1. Code-Kontingent:
   Empfehlung: 3 primaere Einmal-Codes pro Hausnummer. Jeder Code verifiziert genau ein erwachsenes Konto fuer diesen Haushalt.
2. Ersatzcode-Prozess:
   Empfehlung: Ersatzcodes nicht auf Briefe drucken. Im Admin pro Quartier/Strasse vorhalten, erst im Supportfall einer Hausnummer zuordnen und dann ausgeben.
3. Angehoerige ausserhalb des Pilotgebiets:
   Empfehlung fuer Pilot 0: keine externen Angehoerigen ohne eigenen Pilot-Zugang. Senior-/Angehoerigen-QR verbindet nur Personen, die ueber einen verifizierten Pilot-Haushalt gestartet sind.

Optional, aber vor Briefdruck hilfreich:

- Gueltigkeit der Briefcodes: Empfehlung `pilot_end` oder 60 Tage, nicht 24h. QR-Family-Codes bleiben 24h/12h.
- Einladungslimit fuer Bewohner: Empfehlung 2 aktive persoenliche Nachbar-Einladungen je verifiziertem Bewohner im Pilot.
- Briefton: "geschlossener Test", "freiwillig", "keine Zahlungen", "keine Notfall-App".

## Scope To Build Next

Build als naechste Codex-Welle:

- `pilot_household_access_codes` file-first Migration 198, nicht applyen.
- Server-Service fuer Code-Generierung, Status, Claim-Markierung, Ersatzcode-Zuordnung und Export.
- Registrierung anpassen: neuer Pilot-Code zuerst pruefen, dann legacy `households.invite_code` und `neighbor_invitations` als Fallback.
- Admin-Dashboard: eigener Tab "Pilot-Codes" mit Hausnummern, Codekontingenten, Ersatzcodes, Family-Setup-Queue und CSV/Print-Export.
- Brief-/Onboarding-Texte als zentrale Copy-Konstanten plus druckbare Vorschau.
- Tests fuer Service, API, Registration-Adapter, Admin-Komponente und Brieftexte.

Nicht in diese Welle:

- Kein Zahlungssystem, keine Wallets, keine Coins, kein IBAN-/Payment-Link.
- Kein Job-Marktplatz, keine Aufgabenannahme fuer U13, keine bezahlten Jugendaufgaben.
- Keine Prod-DB-Schreibaktion, kein Migration-Apply, kein Deploy, kein Push.
- Kein Versand echter SMS/E-Mail-Briefe aus der App.
- Kein externer Angehoerigenzugang ohne Pilot-Entscheidung.
- Kein Entfernen der bestehenden `households.invite_code`-Fallbacks in derselben Welle.

---

### Task 1: Precheck And Ownership

**Files:**
- Read: `docs/plans/handoff/INBOX.md`
- Read: `AGENTS.md`
- Read: `CLAUDE.md`
- Read: `docs/superpowers/plans/2026-05-14-family-qr-setup-tokens.md`

- [ ] **Step 1: Run status and precheck**

Run:

```powershell
git status --short --branch
git log --oneline -8
rg -n "family_setup|pilot_household|households\\.invite_code|neighbor_invitations|invite_codes|access_codes|checkInviteCode|InviteCodeManager|PilotHouseholds" app lib modules __tests__ supabase docs
```

Expected:

- `family_setup` exists and must be reused.
- `households.invite_code` exists and must remain fallback.
- `invite_codes` exists but is not wired into `checkInviteCode`.
- No existing `pilot_household_access_codes` table/service exists.

- [ ] **Step 2: Add/update INBOX row**

Add one in-progress row before editing multiple files:

```markdown
| in-progress | codex | Pilot Family Code Operationalisierung | `supabase/migrations/198_pilot_household_access_codes.sql` + `supabase/rollbacks/198_pilot_household_access_codes.down.sql` + `lib/pilot/**` + `app/api/admin/pilot-codes/**` + `app/(app)/admin/components/PilotCodeManager.tsx` + `lib/services/registration.service.ts` + `app/api/register/check-invite/route.ts` + `app/api/pilot/households/route.ts` + `__tests__/**` + `docs/superpowers/plans/2026-05-14-pilot-family-code-operationalisierung.md` + `docs/plans/handoff/INBOX.md` | 2026-05-14 | Lokal umgesetzt, getestet und committed; kein Prod-Write, kein Migration-Apply, kein Deploy, kein Push | 2026-05-14 |
```

- [ ] **Step 3: Commit ownership row**

Run:

```powershell
git add docs/plans/handoff/INBOX.md
git commit -m "docs: claim pilot family code operationalization"
```

Expected: local commit only.

### Task 2: Pilot Code Schema

**Files:**
- Create: `supabase/migrations/198_pilot_household_access_codes.sql`
- Create: `supabase/rollbacks/198_pilot_household_access_codes.down.sql`
- Create: `__tests__/lib/pilot/pilot-household-codes-migration.test.ts`

- [ ] **Step 1: Write failing migration text test**

Create `__tests__/lib/pilot/pilot-household-codes-migration.test.ts`:

```ts
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(
  join(process.cwd(), "supabase", "migrations", "198_pilot_household_access_codes.sql"),
  "utf8",
).toLowerCase();

describe("198_pilot_household_access_codes migration", () => {
  it("creates a household-bound pilot code inventory", () => {
    expect(SQL).toContain("create table if not exists pilot_household_access_codes");
    expect(SQL).toContain("household_id uuid references households(id)");
    expect(SQL).toContain("code_hash text not null unique");
    expect(SQL).toContain("code_hint text not null");
    expect(SQL).not.toContain("raw_code");
  });

  it("models primary and replacement codes with claim status", () => {
    expect(SQL).toContain("code_kind text not null");
    expect(SQL).toContain("'primary'");
    expect(SQL).toContain("'replacement'");
    expect(SQL).toContain("status text not null default 'available'");
    expect(SQL).toContain("'claimed'");
    expect(SQL).toContain("'assigned'");
    expect(SQL).toContain("'revoked'");
  });

  it("enables rls and admin-safe policies", () => {
    expect(SQL).toContain("alter table pilot_household_access_codes enable row level security");
    expect(SQL).toContain("is_super_admin()");
    expect(SQL).toContain("is_quarter_admin_for(quarter_id)");
  });
});
```

Run:

```powershell
npx vitest run __tests__/lib/pilot/pilot-household-codes-migration.test.ts
```

Expected: FAIL because migration file does not exist.

- [ ] **Step 2: Create migration**

Create `supabase/migrations/198_pilot_household_access_codes.sql`:

```sql
-- 198_pilot_household_access_codes.sql
-- Pilot 0: haushaltsgebundene Brief-/Ersatzcodes.
-- File-first only: nicht automatisch gegen Prod anwenden.

CREATE TABLE IF NOT EXISTS pilot_household_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id uuid NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  code_hint text NOT NULL,
  code_kind text NOT NULL CHECK (code_kind IN ('primary', 'replacement')),
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'assigned', 'claimed', 'revoked', 'expired')),
  max_claims integer NOT NULL DEFAULT 1 CHECK (max_claims = 1),
  claim_count integer NOT NULL DEFAULT 0 CHECK (claim_count >= 0 AND claim_count <= max_claims),
  assigned_at timestamptz,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  batch_label text NOT NULL DEFAULT 'pilot-0',
  printed_at timestamptz,
  support_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pilot_household_access_codes_household_required_for_primary
    CHECK (code_kind <> 'primary' OR household_id IS NOT NULL),
  CONSTRAINT pilot_household_access_codes_claimed_consistency
    CHECK (
      (status <> 'claimed' AND claimed_by IS NULL AND claimed_at IS NULL AND claim_count = 0)
      OR
      (status = 'claimed' AND claimed_by IS NOT NULL AND claimed_at IS NOT NULL AND claim_count = 1)
    )
);

CREATE INDEX IF NOT EXISTS idx_pilot_household_access_codes_quarter_status
  ON pilot_household_access_codes(quarter_id, status);

CREATE INDEX IF NOT EXISTS idx_pilot_household_access_codes_household
  ON pilot_household_access_codes(household_id, code_kind, status)
  WHERE household_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pilot_household_access_codes_replacement_pool
  ON pilot_household_access_codes(quarter_id, status, created_at)
  WHERE code_kind = 'replacement' AND household_id IS NULL;

ALTER TABLE pilot_household_access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY pilot_household_access_codes_admin_select
  ON pilot_household_access_codes
  FOR SELECT USING (
    is_super_admin()
    OR is_quarter_admin_for(quarter_id)
  );

CREATE POLICY pilot_household_access_codes_admin_insert
  ON pilot_household_access_codes
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR is_quarter_admin_for(quarter_id)
  );

CREATE POLICY pilot_household_access_codes_admin_update
  ON pilot_household_access_codes
  FOR UPDATE USING (
    is_super_admin()
    OR is_quarter_admin_for(quarter_id)
  )
  WITH CHECK (
    is_super_admin()
    OR is_quarter_admin_for(quarter_id)
  );

COMMENT ON TABLE pilot_household_access_codes IS
  'Pilot 0 one-time household access code inventory. Raw codes are never stored.';

COMMENT ON COLUMN pilot_household_access_codes.code_hint IS
  'Non-secret display hint, e.g. formatted prefix plus last four characters for admin support.';
```

Create rollback `supabase/rollbacks/198_pilot_household_access_codes.down.sql`:

```sql
-- 198_pilot_household_access_codes.down.sql

DROP TABLE IF EXISTS pilot_household_access_codes;
```

- [ ] **Step 3: Run migration test**

Run:

```powershell
npx vitest run __tests__/lib/pilot/pilot-household-codes-migration.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit schema**

Run:

```powershell
git add supabase/migrations/198_pilot_household_access_codes.sql supabase/rollbacks/198_pilot_household_access_codes.down.sql __tests__/lib/pilot/pilot-household-codes-migration.test.ts
git commit -m "feat(pilot): add household access code schema"
```

### Task 3: Pilot Code Domain Service

**Files:**
- Create: `lib/pilot/pilot-household-codes.ts`
- Create: `__tests__/lib/pilot/pilot-household-codes.test.ts`
- Modify: `lib/services/pilot.service.ts`
- Test: `__tests__/api/pilot-households.test.ts`

- [ ] **Step 1: Write failing service tests**

Create `__tests__/lib/pilot/pilot-household-codes.test.ts` with tests for:

```ts
import { describe, expect, it } from "vitest";
import {
  buildPilotCodeHint,
  hashPilotAccessCode,
  normalizePilotAccessCode,
  planPilotCodeBatch,
} from "@/lib/pilot/pilot-household-codes";

describe("pilot household access codes", () => {
  it("normalizes printed codes without leaking formatting differences", () => {
    expect(normalizePilotAccessCode(" pilot-abcd-ef23 ")).toBe("PILOTABCDEF23");
  });

  it("hashes codes deterministically and never returns raw code", () => {
    const hash = hashPilotAccessCode("PILOT-ABCD-EF23");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("PILOT");
  });

  it("builds a non-secret support hint", () => {
    expect(buildPilotCodeHint("PILOT-ABCD-EF23")).toBe("PILOT-...EF23");
  });

  it("plans three primary codes per household and separate replacements", () => {
    const plan = planPilotCodeBatch({
      households: [
        { id: "hh-1", quarterId: "q-1", streetName: "Purkersdorfer Strasse", houseNumber: "35" },
        { id: "hh-2", quarterId: "q-1", streetName: "Sanarystrasse", houseNumber: "2" },
      ],
      primaryPerHousehold: 3,
      replacementCount: 2,
      batchLabel: "pilot-0",
    });

    expect(plan.primary).toHaveLength(6);
    expect(plan.replacements).toHaveLength(2);
    expect(plan.primary.every((code) => code.codeKind === "primary")).toBe(true);
    expect(plan.replacements.every((code) => code.householdId === null)).toBe(true);
  });
});
```

Run:

```powershell
npx vitest run __tests__/lib/pilot/pilot-household-codes.test.ts
```

Expected: FAIL because service does not exist.

- [ ] **Step 2: Implement service**

Create `lib/pilot/pilot-household-codes.ts`:

```ts
import { createHash } from "crypto";
import { generateQuarterCode } from "@/lib/invite-codes";

export type PilotCodeKind = "primary" | "replacement";
export type PilotCodeStatus = "available" | "assigned" | "claimed" | "revoked" | "expired";

export interface PilotCodeHouseholdInput {
  id: string;
  quarterId: string;
  streetName: string;
  houseNumber: string;
}

export interface PilotCodeBatchInput {
  households: PilotCodeHouseholdInput[];
  primaryPerHousehold: number;
  replacementCount: number;
  batchLabel: string;
  prefix?: string;
}

export interface PlannedPilotCode {
  rawCode: string;
  codeHash: string;
  codeHint: string;
  codeKind: PilotCodeKind;
  status: PilotCodeStatus;
  quarterId: string;
  householdId: string | null;
  batchLabel: string;
}

export function normalizePilotAccessCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashPilotAccessCode(code: string): string {
  return createHash("sha256")
    .update(normalizePilotAccessCode(code), "utf8")
    .digest("hex");
}

export function buildPilotCodeHint(code: string): string {
  const formatted = code.toUpperCase().trim();
  const prefix = formatted.split("-")[0] || "CODE";
  const normalized = normalizePilotAccessCode(formatted);
  return `${prefix}-...${normalized.slice(-4)}`;
}

export function planPilotCodeBatch(input: PilotCodeBatchInput): {
  primary: PlannedPilotCode[];
  replacements: PlannedPilotCode[];
} {
  const prefix = input.prefix ?? "PILOT";
  const primary: PlannedPilotCode[] = [];

  for (const household of input.households) {
    for (let i = 0; i < input.primaryPerHousehold; i += 1) {
      primary.push(buildPlannedCode({
        prefix,
        codeKind: "primary",
        quarterId: household.quarterId,
        householdId: household.id,
        batchLabel: input.batchLabel,
      }));
    }
  }

  const replacementQuarterId = input.households[0]?.quarterId;
  const replacements = replacementQuarterId
    ? Array.from({ length: input.replacementCount }, () =>
        buildPlannedCode({
          prefix,
          codeKind: "replacement",
          quarterId: replacementQuarterId,
          householdId: null,
          batchLabel: input.batchLabel,
        }),
      )
    : [];

  return { primary, replacements };
}

function buildPlannedCode(input: {
  prefix: string;
  codeKind: PilotCodeKind;
  quarterId: string;
  householdId: string | null;
  batchLabel: string;
}): PlannedPilotCode {
  const rawCode = generateQuarterCode(input.prefix);
  return {
    rawCode,
    codeHash: hashPilotAccessCode(rawCode),
    codeHint: buildPilotCodeHint(rawCode),
    codeKind: input.codeKind,
    status: input.codeKind === "replacement" && input.householdId === null ? "available" : "assigned",
    quarterId: input.quarterId,
    householdId: input.householdId,
    batchLabel: input.batchLabel,
  };
}
```

- [ ] **Step 3: Run service tests**

Run:

```powershell
npx vitest run __tests__/lib/pilot/pilot-household-codes.test.ts
```

Expected: PASS.

- [ ] **Step 4: Extend pilot service return shape**

Modify `lib/services/pilot.service.ts` so `PilotHousehold` includes:

```ts
export interface PilotHouseholdCodeSummary {
  id: string;
  code_hint: string;
  code_kind: "primary" | "replacement";
  status: "available" | "assigned" | "claimed" | "revoked" | "expired";
  batch_label: string;
  printed_at: string | null;
  claimed_at: string | null;
}
```

Keep current `invite_code` in response for backward compatibility, but add `codes: PilotHouseholdCodeSummary[]`.

Expected compatibility: existing `__tests__/api/pilot-households.test.ts` still passes.

- [ ] **Step 5: Commit service**

Run:

```powershell
git add lib/pilot/pilot-household-codes.ts lib/services/pilot.service.ts __tests__/lib/pilot/pilot-household-codes.test.ts __tests__/api/pilot-households.test.ts
git commit -m "feat(pilot): add household code planning service"
```

### Task 4: Registration Adapter For Pilot Codes

**Files:**
- Modify: `lib/services/registration.service.ts`
- Modify: `app/api/register/check-invite/route.ts`
- Create: `__tests__/lib/registration-pilot-codes.test.ts`
- Modify: `__tests__/api/register-complete-bugfix.test.ts`

- [ ] **Step 1: Write failing registration tests**

Create `__tests__/lib/registration-pilot-codes.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { checkInviteCode } from "@/lib/services/registration.service";
import { hashPilotAccessCode } from "@/lib/pilot/pilot-household-codes";

function createDb() {
  return {
    from: vi.fn((table: string) => {
      if (table === "pilot_household_access_codes") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "code-1",
                    household_id: "hh-1",
                    status: "assigned",
                    code_kind: "primary",
                    households: { street_name: "Purkersdorfer Strasse", house_number: "35" },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    }),
  };
}

describe("checkInviteCode with pilot household access codes", () => {
  it("accepts an assigned pilot household code before legacy fallbacks", async () => {
    const db = createDb();
    const result = await checkInviteCode(db as never, "PILOT-ABCD-EF23");

    expect(result).toEqual({
      valid: true,
      householdId: "hh-1",
      streetName: "Purkersdorfer Strasse",
      houseNumber: "35",
      pilotAccessCodeId: "code-1",
    });
    expect(db.from).toHaveBeenCalledWith("pilot_household_access_codes");
  });

  it("uses sha256 hash lookup instead of raw code", async () => {
    const db = createDb();
    await checkInviteCode(db as never, "PILOT-ABCD-EF23");
    const expectedHash = hashPilotAccessCode("PILOT-ABCD-EF23");
    expect(JSON.stringify(db.from.mock.results)).toContain(expectedHash);
    expect(JSON.stringify(db.from.mock.results)).not.toContain("PILOT-ABCD-EF23");
  });
});
```

Run:

```powershell
npx vitest run __tests__/lib/registration-pilot-codes.test.ts
```

Expected: FAIL until adapter exists.

- [ ] **Step 2: Extend `InviteCheckResult`**

In `lib/services/registration.service.ts`, add:

```ts
pilotAccessCodeId?: string;
```

to `InviteCheckResult` and `RegistrationInput`.

- [ ] **Step 3: Add pilot-code lookup before legacy lookup**

In `checkInviteCode`, before `households.invite_code`, query:

```ts
const pilotCodeHash = hashPilotAccessCode(inviteCode);
const { data: pilotCode } = await adminDb
  .from("pilot_household_access_codes")
  .select("id, household_id, status, code_kind, households(street_name, house_number)")
  .eq("code_hash", pilotCodeHash)
  .in("status", ["assigned", "available"])
  .maybeSingle();
```

If `pilotCode.household_id` exists, return the household and `pilotAccessCodeId`.

- [ ] **Step 4: Mark pilot code claimed during registration**

In `assignHouseholdAndVerify`, after `household_members` insert succeeds, if `pilotAccessCodeId` is present:

```ts
await adminDb
  .from("pilot_household_access_codes")
  .update({
    status: "claimed",
    claimed_by: userId,
    claimed_at: new Date().toISOString(),
    claim_count: 1,
    updated_at: new Date().toISOString(),
  })
  .eq("id", pilotAccessCodeId)
  .eq("status", "assigned")
  .eq("household_id", householdId);
```

Keep legacy `households.invite_code` path unchanged.

- [ ] **Step 5: Pass adapter field through API**

`app/api/register/check-invite/route.ts` already returns `checkInviteCode` result. Confirm no wrapper strips `pilotAccessCodeId`.

`app/(auth)/register/components/RegisterStepInvite.tsx` does not need to display it; hidden registration state needs the field only if `RegisterState` is typed strictly. If needed, add `pilotAccessCodeId: string | null` to `components/types.ts`.

- [ ] **Step 6: Run tests**

Run:

```powershell
npx vitest run __tests__/lib/registration-pilot-codes.test.ts __tests__/api/register-complete-bugfix.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit adapter**

Run:

```powershell
git add lib/services/registration.service.ts app/api/register/check-invite/route.ts app/(auth)/register/components/types.ts app/(auth)/register/components/RegisterStepInvite.tsx __tests__/lib/registration-pilot-codes.test.ts __tests__/api/register-complete-bugfix.test.ts
git commit -m "feat(pilot): accept household access codes in registration"
```

### Task 5: Resident Invitation Limit For Pilot

**Files:**
- Modify: `lib/invitations.ts`
- Modify: `lib/services/invitations.service.ts`
- Create: `__tests__/lib/pilot-invitation-limits.test.ts`

- [ ] **Step 1: Write failing limit test**

Create `__tests__/lib/pilot-invitation-limits.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { checkInviteLimit } from "@/lib/invitations";

describe("pilot resident invitation limits", () => {
  it("limits non-admin closed-pilot residents to two active invites", async () => {
    const db = {
      from: vi.fn((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { is_admin: false }, error: null }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ count: 2, error: null }),
            }),
          }),
        };
      }),
    };

    const result = await checkInviteLimit(db as never, "user-1", "free", { closedPilotLimit: 2 });
    expect(result).toEqual({ allowed: false, remaining: 0, limit: 2 });
  });
});
```

Run:

```powershell
npx vitest run __tests__/lib/pilot-invitation-limits.test.ts
```

Expected: FAIL until optional limit override exists.

- [ ] **Step 2: Add explicit closed-pilot override**

Change `checkInviteLimit` signature to:

```ts
export async function checkInviteLimit(
  supabase: SupabaseClient,
  userId: string,
  userPlan: string,
  options: { closedPilotLimit?: number } = {},
): Promise<{ allowed: boolean; remaining: number; limit: number }>
```

Use:

```ts
const limit = profile?.is_admin
  ? 9999
  : typeof options.closedPilotLimit === "number"
    ? options.closedPilotLimit
    : PILOT_MODE
      ? Math.max(INVITE_LIMITS[userPlan] ?? 15, 50)
      : (INVITE_LIMITS[userPlan] ?? 15);
```

In `sendInvitation`, call `checkInviteLimit(supabase, userId, userPlan, { closedPilotLimit: 2 })` only when `NEXT_PUBLIC_PILOT_MODE === "true"`.

- [ ] **Step 3: Run tests**

Run:

```powershell
npx vitest run __tests__/lib/pilot-invitation-limits.test.ts __tests__/lib/invitations.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit limit**

Run:

```powershell
git add lib/invitations.ts lib/services/invitations.service.ts __tests__/lib/pilot-invitation-limits.test.ts __tests__/lib/invitations.test.ts
git commit -m "feat(pilot): limit resident invitations"
```

### Task 6: Admin Pilot Codes API

**Files:**
- Create: `app/api/admin/pilot-codes/route.ts`
- Create: `app/api/admin/pilot-codes/[id]/assign/route.ts`
- Create: `app/api/admin/pilot-codes/[id]/revoke/route.ts`
- Create: `app/api/admin/pilot-codes/export/route.ts`
- Create: `modules/admin/services/pilot-codes.service.ts`
- Create: `__tests__/api/admin/pilot-codes.test.ts`

- [ ] **Step 1: Write route tests**

Create `__tests__/api/admin/pilot-codes.test.ts` with cases:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockProfileSingle = vi.fn();
const mockListPilotCodeHouseholds = vi.fn();
const mockCreatePilotCodeBatch = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table !== "users") throw new Error(`Unexpected table ${table}`);
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockProfileSingle,
          })),
        })),
      };
    }),
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => ({ serviceRole: true })),
}));

vi.mock("@/modules/admin/services/pilot-codes.service", () => ({
  listPilotCodeHouseholds: (...args: unknown[]) =>
    mockListPilotCodeHouseholds(...args),
  createPilotCodeBatch: (...args: unknown[]) =>
    mockCreatePilotCodeBatch(...args),
}));

function makeRequest(url: string, body?: unknown) {
  return new NextRequest(url, {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("admin pilot codes API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "admin-1" } },
      error: null,
    });
    mockProfileSingle.mockResolvedValue({
      data: { is_admin: true, role: "quarter_admin" },
      error: null,
    });
  });

  it("rejects list requests without authenticated admin session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const { GET } = await import("@/app/api/admin/pilot-codes/route");

    const response = await GET(
      makeRequest("http://localhost/api/admin/pilot-codes?quarterId=q-1"),
    );

    expect(response.status).toBe(401);
  });

  it("returns arrays for list responses", async () => {
    const rows = [
      {
        householdId: "hh-1",
        streetName: "Purkersdorfer Strasse",
        houseNumber: "35",
        primaryTotal: 3,
        primaryClaimed: 0,
        replacementTotal: 0,
      },
    ];
    mockListPilotCodeHouseholds.mockResolvedValue(rows);
    const { GET } = await import("@/app/api/admin/pilot-codes/route");

    const response = await GET(
      makeRequest("http://localhost/api/admin/pilot-codes?quarterId=q-1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toEqual(rows);
    expect(mockListPilotCodeHouseholds).toHaveBeenCalledWith(
      { serviceRole: true },
      "admin-1",
      "q-1",
    );
  });

  it("returns newly created raw codes only on batch creation", async () => {
    mockCreatePilotCodeBatch.mockResolvedValue({
      createdCodes: [
        {
          householdId: "hh-1",
          rawCode: "PILOT-ABCD-EF23",
          codeHint: "PILOT-...EF23",
        },
      ],
    });
    const { POST } = await import("@/app/api/admin/pilot-codes/route");

    const response = await POST(
      makeRequest("http://localhost/api/admin/pilot-codes", {
        quarterId: "q-1",
        householdIds: ["hh-1"],
        primaryPerHousehold: 3,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.createdCodes).toEqual([
      {
        householdId: "hh-1",
        rawCode: "PILOT-ABCD-EF23",
        codeHint: "PILOT-...EF23",
      },
    ]);
  });
});
```

- [ ] **Step 2: Implement service methods**

`modules/admin/services/pilot-codes.service.ts` exports:

```ts
export async function listPilotCodeHouseholds(adminDb, actorUserId, quarterId)
export async function createPilotCodeBatch(adminDb, actorUserId, input)
export async function assignReplacementCode(adminDb, actorUserId, input)
export async function revokePilotCode(adminDb, actorUserId, input)
export async function exportPilotLetterRows(adminDb, actorUserId, quarterId)
```

All methods must:

- verify actor is `super_admin` or quarter admin for `quarterId`;
- use service role for DB writes;
- write `admin_audit_log` for create/assign/revoke/print-mark actions;
- return arrays directly for list/export API bodies.

- [ ] **Step 3: Implement routes**

Routes:

- `GET /api/admin/pilot-codes?quarterId=...` returns an array.
- `POST /api/admin/pilot-codes` creates missing codes for selected households, returns created raw codes once.
- `POST /api/admin/pilot-codes/[id]/assign` assigns an unassigned replacement to a household.
- `POST /api/admin/pilot-codes/[id]/revoke` revokes one code with `support_note`.
- `GET /api/admin/pilot-codes/export?quarterId=...&format=csv` returns CSV for printing.

No route returns `{ items: [...] }`.

- [ ] **Step 4: Run tests**

Run:

```powershell
npx vitest run __tests__/api/admin/pilot-codes.test.ts __tests__/modules/admin/admin-audit-log.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit API**

Run:

```powershell
git add app/api/admin/pilot-codes modules/admin/services/pilot-codes.service.ts __tests__/api/admin/pilot-codes.test.ts __tests__/modules/admin/admin-audit-log.test.ts
git commit -m "feat(admin): add pilot code operations API"
```

### Task 7: Admin Dashboard Scope And UI

**Files:**
- Create: `app/(app)/admin/components/PilotCodeManager.tsx`
- Modify: `app/(app)/admin/page.tsx`
- Modify: `app/(app)/admin/components/InviteCodeManager.tsx`
- Create: `__tests__/components/admin/PilotCodeManager.test.tsx`

- [ ] **Step 1: Write failing component test**

Create `__tests__/components/admin/PilotCodeManager.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PilotCodeManager } from "@/app/(app)/admin/components/PilotCodeManager";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("PilotCodeManager", () => {
  it("shows household code counts and separates replacements", () => {
    render(
      <PilotCodeManager
        initialRows={[
          {
            householdId: "hh-1",
            streetName: "Purkersdorfer Strasse",
            houseNumber: "35",
            primaryTotal: 3,
            primaryClaimed: 1,
            replacementTotal: 1,
            replacementAvailable: 1,
            pendingFamilyReviews: 0,
            linkedSeniors: 0,
          },
        ]}
      />,
    );

    expect(screen.getByText("Purkersdorfer Strasse 35")).toBeInTheDocument();
    expect(screen.getByText("1/3 genutzt")).toBeInTheDocument();
    expect(screen.getByText("1 Ersatzcode")).toBeInTheDocument();
  });
});
```

Run:

```powershell
npx vitest run __tests__/components/admin/PilotCodeManager.test.tsx
```

Expected: FAIL because component does not exist.

- [ ] **Step 2: Implement component**

`PilotCodeManager` UI must show:

- selected quarter;
- household rows grouped by street;
- primary code count `claimed/total`;
- replacement count;
- action "fehlende Codes erzeugen";
- action "Ersatzcode zuordnen";
- action "Briefliste exportieren";
- badges for child review queue and senior links.

Use existing UI primitives and avoid nested cards.

- [ ] **Step 3: Wire admin tab**

In `app/(app)/admin/page.tsx`:

- add `"pilot-codes"` to system tools;
- label `Pilot-Codes`;
- render `<PilotCodeManager initialRows={[]} />`;
- keep old `InviteCodeManager` available as `Einladungen (alt)` or move under same tab as secondary panel.

- [ ] **Step 4: Run tests**

Run:

```powershell
npx vitest run __tests__/components/admin/PilotCodeManager.test.tsx __tests__/components/admin/UserManagementPilot.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit UI**

Run:

```powershell
git add app/(app)/admin/page.tsx app/(app)/admin/components/PilotCodeManager.tsx app/(app)/admin/components/InviteCodeManager.tsx __tests__/components/admin/PilotCodeManager.test.tsx
git commit -m "feat(admin): add pilot code dashboard"
```

### Task 8: Family Setup Admin Queue

**Files:**
- Modify: `modules/admin/services/pilot-codes.service.ts`
- Modify: `app/(app)/admin/components/PilotCodeManager.tsx`
- Create: `__tests__/components/admin/PilotFamilySetupQueue.test.tsx`

- [ ] **Step 1: Add test for review indicators**

Test rows include:

```ts
{
  pendingFamilyReviews: 1,
  pendingFriendApprovals: 2,
  linkedSeniors: 1,
  seniorPendingConsent: 1,
}
```

Expected UI labels:

- `1 Kinderkonto pruefen`
- `2 Freundeinladungen offen`
- `1 Senior verknuepft`
- `1 Zustimmung offen`

- [ ] **Step 2: Extend service aggregation**

Aggregate from:

- `family_setup_invitations` where `status = 'needs_admin_review'` and `flow_type = 'child_direct'`;
- `family_setup_invitations` where `status = 'pending_parent_approval'` and `flow_type = 'child_friend'`;
- `caregiver_links` where `setup_origin = 'family_qr'`;
- `caregiver_links` where `consent_status = 'pending_senior_confirm'`.

Group by `household_id`.

- [ ] **Step 3: Keep admin actions minimal**

For Pilot 0, build only visibility and manual support notes. Do not build:

- child account admin approval flow beyond listing;
- senior consent override;
- external caregiver invite flow.

- [ ] **Step 4: Run tests and commit**

Run:

```powershell
npx vitest run __tests__/components/admin/PilotFamilySetupQueue.test.tsx __tests__/api/admin/pilot-codes.test.ts
```

Commit:

```powershell
git add modules/admin/services/pilot-codes.service.ts app/(app)/admin/components/PilotCodeManager.tsx __tests__/components/admin/PilotFamilySetupQueue.test.tsx __tests__/api/admin/pilot-codes.test.ts
git commit -m "feat(admin): surface family setup pilot queue"
```

### Task 9: Brief And Onboarding Copy

**Files:**
- Create: `lib/pilot/pilot-letter-copy.ts`
- Create: `app/(app)/admin/components/PilotLetterPreview.tsx`
- Modify: `app/(auth)/onboarding-anleitung/page.tsx`
- Modify: `app/(auth)/register/components/RegisterStepEntry.tsx`
- Modify: `app/(auth)/register/components/RegisterStepInvite.tsx`
- Create: `__tests__/lib/pilot-letter-copy.test.ts`
- Create: `__tests__/components/admin/PilotLetterPreview.test.tsx`

- [ ] **Step 1: Write copy tests**

Create `__tests__/lib/pilot-letter-copy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildPilotLetterText } from "@/lib/pilot/pilot-letter-copy";

describe("pilot letter copy", () => {
  it("contains pilot boundaries and no payment or job language", () => {
    const text = buildPilotLetterText({
      streetName: "Purkersdorfer Strasse",
      houseNumber: "35",
      codes: ["PILOT-ABCD-EF23", "PILOT-GHJK-LM45", "PILOT-NPQR-ST67"],
      supportEmail: "thomasth@gmx.de",
    });

    expect(text).toContain("geschlossener Pilot");
    expect(text).toContain("nicht oeffentlich teilen");
    expect(text).toContain("112 oder 110");
    expect(text).not.toMatch(/zahlung|wallet|job|iban|coin/i);
  });
});
```

- [ ] **Step 2: Implement copy**

Create `lib/pilot/pilot-letter-copy.ts`:

```ts
export interface PilotLetterInput {
  streetName: string;
  houseNumber: string;
  codes: string[];
  supportEmail: string;
}

export function buildPilotLetterText(input: PilotLetterInput): string {
  const codeLines = input.codes
    .map((code, index) => `${index + 1}. ${code}`)
    .join("\n");

  return [
    "Willkommen zum geschlossenen Pilot von QuartierApp in Bad Saeckingen.",
    `Dieser Brief ist fuer ${input.streetName} ${input.houseNumber}.`,
    "",
    "Ihre Hausnummer-Codes:",
    codeLines,
    "",
    "Bitte geben Sie diese Codes nur an Personen weiter, die wirklich zu Ihrem Haushalt gehoeren. Die Codes nicht oeffentlich teilen.",
    "Kinder und Jugendliche unter 18 registrieren sich nicht alleine. Ein Elternteil richtet den Zugang ein oder gibt eine Einladung frei.",
    "Senior-Zugaenge koennen im Profil vorbereitet werden. Sensible Daten bleiben geschuetzt, bis der Senior zustimmt.",
    "Bei Feuer, medizinischem Notfall oder Gefahr rufen Sie immer zuerst 112 oder 110. QuartierApp ersetzt keinen Notruf.",
    "Der Pilot ist freiwillig und kostenlos. Es gibt keine Zahlungen, keine Wallets und keinen Job-Marktplatz.",
    `Bei Fragen oder verlorenen Codes: ${input.supportEmail}`,
  ].join("\n");
}
```

- [ ] **Step 3: Add print preview**

Create `PilotLetterPreview` that renders:

- address heading;
- three primary codes;
- short QR/URL instruction if available;
- the text from `buildPilotLetterText`;
- print-friendly layout.

- [ ] **Step 4: Update onboarding text**

Make these exact copy changes:

- `RegisterStepInvite`: "Ihr Hausnummer-Code steht auf Ihrem Brief. Persoenliche Nachbar-Einladungen koennen spaeter zwei weitere Bewohner einladen."
- `RegisterStepEntry`: remove "Aushang" from invite-code description. Codes should not be public.
- `onboarding-anleitung`: add section "Familie & Betreuung" with parent/child and senior/relative rules.

- [ ] **Step 5: Run tests and commit**

Run:

```powershell
npx vitest run __tests__/lib/pilot-letter-copy.test.ts __tests__/components/admin/PilotLetterPreview.test.tsx __tests__/app/onboarding-anleitung-page.test.tsx __tests__/app/register-entry.test.tsx
```

Commit:

```powershell
git add lib/pilot/pilot-letter-copy.ts app/(app)/admin/components/PilotLetterPreview.tsx app/(auth)/onboarding-anleitung/page.tsx app/(auth)/register/components/RegisterStepEntry.tsx app/(auth)/register/components/RegisterStepInvite.tsx __tests__/lib/pilot-letter-copy.test.ts __tests__/components/admin/PilotLetterPreview.test.tsx __tests__/app/onboarding-anleitung-page.test.tsx __tests__/app/register-entry.test.tsx
git commit -m "docs(pilot): add family onboarding letter copy"
```

### Task 10: Verification

**Files:**
- All touched files

- [ ] **Step 1: Run targeted tests**

Run:

```powershell
npx vitest run __tests__/lib/pilot/pilot-household-codes-migration.test.ts __tests__/lib/pilot/pilot-household-codes.test.ts __tests__/lib/registration-pilot-codes.test.ts __tests__/lib/pilot-invitation-limits.test.ts __tests__/api/admin/pilot-codes.test.ts __tests__/components/admin/PilotCodeManager.test.tsx __tests__/lib/pilot-letter-copy.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run broader checks**

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 3: Optional local browser smoke**

Only if frontend changed and local env is ready:

```powershell
npm run dev
```

Open:

- `/admin` and switch to `Pilot-Codes`;
- `/register` and check invite-code copy;
- `/onboarding-anleitung` and print preview.

Expected:

- no console errors;
- no overlapping text;
- admin code rows visible only for admin;
- no payment/job wording.

- [ ] **Step 4: Final commit and INBOX done**

Update `docs/plans/handoff/INBOX.md` row to `done` with verification summary.

Run:

```powershell
git add docs/plans/handoff/INBOX.md
git commit -m "docs: complete pilot family code operationalization handoff"
```

Do not push, deploy, apply migration, or write Prod DB without explicit Founder-Go.

## Acceptance Criteria

- Pilot admin can generate 3 primary one-time codes per Hausnummer without duplicating household rows.
- Replacement codes exist as unassigned pool and are assigned only in support cases.
- Registration accepts new pilot access codes and marks each as claimed exactly once.
- Legacy `households.invite_code` and `neighbor_invitations` still work.
- Verified residents can create at most 2 active personal invitations in closed pilot.
- Children cannot use normal adult registration; parent-created child setup remains QR-based and max 5 direct children per guardian.
- Senior setup remains QR-based, creates `caregiver_links`, and keeps sensitive data locked until senior consent.
- Admin dashboard shows code status, replacements, family review signals and senior consent status per household.
- Brief/onboarding copy explains code privacy, parent/child rules, senior consent, no payments, no job marketplace and 112/110 first.
- All APIs returning lists return arrays directly, not `{ items: [...] }`.

## Plan Self-Review

- Spec coverage: covers codes per Hausnummer, Ersatzcodes, resident invites, parents/children, seniors/relatives, admin scope and texts.
- Completeness scan: no implementation step may remain as a vague "add tests" without a named file and behavior.
- Type consistency: use `PilotCodeKind`, `PilotCodeStatus`, `pilotAccessCodeId`, and `PilotHouseholdCodeSummary` consistently.
- Risk note: this plan intentionally introduces Migration 198 as file-first only. Applying it to Prod remains a red-zone Founder decision.
