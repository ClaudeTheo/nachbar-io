# Handoff: Housing Part H + Deploy

**Stand 2026-04-20**, Branch `feature/hausverwaltung` HEAD `f8a3f03`, lokal, kein Push.

## Was ist gemacht

Part A (A1-A7) komplett auf `feature/hausverwaltung`, 6 Commits seit `c7c5250`:

| Commit | Inhalt |
|---|---|
| `f6e4f53` | A1 Mig 175 (Schatten-Quartier Seed) + `lib/quarter-shadow.ts` |
| `c380c7e` | A2 Mig 176 `housing_resident_links` |
| `ae00a54` | A2b Mig 177 (6 Feature-Flags) + Admin-Dashboard-Gruppe |
| `634b942` | **A3-Pivot** Mig 178 PLZ-Auto-Quartier + `lib/quarters/postal-auto.ts` + `quarter_admins`-Auto-Insert |
| `f54eb80` | A4+A5 civic-aware Nav + `notifyCivicOrgStaff` |
| `f8a3f03` | A6+A7 Voice→`municipal_reports` + `lib/housing/feature-flags.ts` |

~52 neue Tests, tsc 0 Errors. Migrationen 175-178 file-first, **NICHT auf Prod**.

Authoritative Memory: [memory/topics/housing.md](../../../memory/topics/housing.md).

## Was Part H bauen muss

**Founder-Direktive 2026-04-21:** Bewohner laedt HV ein via Triple-Choice (mailto / Web-Share-API / PDF). **Anwaltsfrei, kein Resend-SMTP.** Bewohner ist Sender, App stellt nur Tools.

**Reihenfolge:** Teil H VOR Teil B (HV muss erst eingeladen werden, bevor Maengelmeldungen Sinn machen).

### Mig 180 `housing_invitations`

```sql
-- Migration 180: Bewohner-zu-Hausverwaltung Einladungs-Token
CREATE TABLE IF NOT EXISTS housing_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_token TEXT UNIQUE NOT NULL,           -- 32-char base64url, fuer Magic-Link
  invite_code TEXT UNIQUE NOT NULL,             -- 6-stellig numerisch, Backup zur manuellen Eingabe
  invited_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  expected_org_name TEXT NOT NULL,              -- "Hausverwaltung Mueller GmbH" (Bewohner gibt ein)
  expected_email TEXT NULL,                      -- optional, nur fuer mailto-Pfad
  channel TEXT NOT NULL CHECK (channel IN ('mailto','share','pdf')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  consumed_at TIMESTAMPTZ NULL,
  consumed_by_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  consumed_by_civic_org_id UUID NULL REFERENCES civic_organizations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_hi_household ON housing_invitations(invited_household_id);
CREATE INDEX IF NOT EXISTS idx_hi_token ON housing_invitations(invite_token) WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hi_code ON housing_invitations(invite_code) WHERE consumed_at IS NULL;

ALTER TABLE housing_invitations ENABLE ROW LEVEL SECURITY;

-- Bewohner sieht eigene Einladungen
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='housing_invitations' AND policyname='hi_select_own') THEN
    CREATE POLICY "hi_select_own" ON housing_invitations
      FOR SELECT USING (
        invited_by_user_id = auth.uid()
        OR invited_household_id IN (
          SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Bewohner darf eigene Einladungen anlegen
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='housing_invitations' AND policyname='hi_insert_own') THEN
    CREATE POLICY "hi_insert_own" ON housing_invitations
      FOR INSERT WITH CHECK (
        invited_by_user_id = auth.uid()
        AND invited_household_id IN (
          SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Consume-Pfad laeuft via Service-Role (Admin-API), keine User-RLS-Policy noetig.
```

### Service `lib/housing/invitations.ts`

```typescript
export interface CreateInvitationInput {
  householdId: string;
  invitedByUserId: string;
  expectedOrgName: string;
  expectedEmail?: string;
  channel: 'mailto' | 'share' | 'pdf';
}

export async function createHousingInvitation(
  adminDb: SupabaseClient,
  input: CreateInvitationInput,
): Promise<{ token: string; code: string; expiresAt: string }> {
  // generateSecureToken (32-char base64url, crypto.randomBytes(24).toString('base64url'))
  // generateInviteCode (6-stellig, ziffer 0-9, raceCheck via UNIQUE-Index Retry bei 23505)
  // INSERT, gib Magic-Link-URL + Code zurueck
}

export async function consumeHousingInvitation(
  adminDb: SupabaseClient,
  tokenOrCode: string,
  hvUserId: string,
): Promise<{ civicOrgId: string; householdId: string }> {
  // 1. SELECT housing_invitations WHERE (invite_token = X OR invite_code = X) AND consumed_at IS NULL AND expires_at > now()
  // 2. Wenn kein hit → throw not-found
  // 3. INSERT civic_organization (name = expected_org_name, type = 'housing', municipality NULL)
  // 4. INSERT civic_members (org_id, user_id = hvUserId, role = 'admin')
  // 5. INSERT housing_resident_links (civic_org_id, household_id, user_id = invited_by_user_id, linked_by = hvUserId)
  // 6. UPDATE housing_invitations SET consumed_at, consumed_by_user_id, consumed_by_civic_org_id
  // 7. notifyOrgStaff or directly: Push an Bewohner "Ihre HV hat sich verbunden"
}
```

### API-Routen

- `POST /api/housing/invitations` — Bewohner erstellt Einladung. Body: `{ expectedOrgName, expectedEmail?, channel }`. Holt householdId aus Session.
- `POST /api/housing/invitations/consume` — HV (eingeloggt oder neu-registriert) loest Token ein. Body: `{ token }`.
- `GET /api/housing/invitations/[token]/info` — Public-Endpoint, gibt `{ expectedOrgName, invitedHouseholdAddress, expiresAt }` zurueck (fuer Landing-Page).

### UI

**Bewohner-Seite `app/(app)/hausverwaltung/einladen/page.tsx`:**
- Senior-Mode (80px Touch-Targets)
- Felder: HV-Name (Pflicht), HV-Email (optional)
- Triple-Choice-Buttons:
  - **Per E-Mail einladen** → `<a href="mailto:{email}?subject=...&body=...">` mit dem Magic-Link inline
  - **Teilen** → `navigator.share({title, text, url})` falls verfuegbar, sonst Clipboard-Copy
  - **PDF drucken** → generiert clientseitig PDF mit `jsPDF` oder serverseitig — Brief-Vorlage mit Magic-Link + Code + QR
- Anzeige des generierten 6-stelligen Codes (gross, fuer telefonische Weitergabe)

**HV-Landing `app/einladung/[token]/page.tsx` (Public Route):**
- Zeigt: "Frau Theobald hat Sie zur Hausverwaltung von Quartier 79713 eingeladen"
- Zwei Pfade: 
  - **Anmelden** (HV hat schon Account) → POST consume mit eingeloggtem User
  - **Account anlegen** → Standard-Register-Flow, dann automatisch consume nach Login
- Nach Consume: Redirect auf `/org/housing` (Cockpit, kommt in Teil B5)

### Tests (TDD Pflicht)

- `__tests__/lib/housing/invitations.test.ts` — Service-Logik (create, consume, expired, race)
- `__tests__/api/housing/invitations.test.ts` — API-Routen
- `__tests__/app/hausverwaltung/einladen.test.tsx` — UI Triple-Choice (mailto-href, share-button, pdf-trigger)
- E2E `e2e/housing-invitation-flow.spec.ts` (optional) — Bewohner laedt ein → HV oeffnet Link → consume → housing_resident_links da

### Pre-Check vor Bau

```bash
# Existiert housing_invitations bereits?
grep -rn "housing_invitations" supabase/migrations/ lib/ modules/
# Erwartet: nichts ausser docs/plans/

# Ist civic_members.role-Feld da?
grep -nE "civic_members.*role|civic_members CHECK" supabase/migrations/*.sql

# Wird civic_organizations.municipality benoetigt?
grep -n "municipality" supabase/migrations/146*.sql
```

## Was nach Part H kommt

Teil B (Maengelmeldungen) — siehe Plan-File. Mig fuer `municipal_reports.target_org_id` + RLS housing-aware. Cockpit-UI unter `/org/housing/reports`.

## Tor-Bedingungen Push

Vor `git push origin master`:

1. ✅ Alle Tests gruen (Branch `feature/hausverwaltung` Stand `f8a3f03`)
2. ✅ tsc 0 Errors
3. ⏳ Welle-C-Push live (separates Thema, master `c7c5250` ungepusht)
4. ⏳ GmbH eingetragen (Notar 27.04.2026)
5. ⏳ AVV Anthropic + Mistral unterschrieben (kann erst nach GmbH)
6. ⏳ Founder-Walkthrough Part A (B4 aus Welle C)
7. ⏳ Prod-Apply Mig 175-180 mit Founder-Go (Rote Zone, eine Migration nach der anderen)

Bis dahin: Branch lebt lokal, normale Iteration.

## Naechste Session — Empfohlener Einstieg

```
1. mem_context (recall this session)
2. Read memory/topics/housing.md
3. Read this handoff
4. cd nachbar-io && git status (sollte sauber sein, branch feature/hausverwaltung)
5. npm run test (Tests gruen)
6. Pre-Check: grep -rn "housing_invitations" lib/ supabase/
7. Mig 180 schreiben (file-first)
8. TDD Service → API → UI
```

Founder-Go-Schwelle: nur Mig-Prod-Apply + git push. Sonst autonom.
