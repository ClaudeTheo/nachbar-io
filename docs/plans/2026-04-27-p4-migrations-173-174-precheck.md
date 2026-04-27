# P4 Precheck: Migration 173/174 Drift

Stand: 2026-04-27

## Scope

Read-only/rollback Precheck fuer die offenen Prod-Drifts:

- `supabase/migrations/173_memory_consents.sql`
- `supabase/migrations/174_tighten_memory_consents_rls.sql`

Keine Migration wurde dauerhaft angewendet.

## Befund Prod vor Apply

`supabase_migrations.schema_migrations`:

| Version | Status |
|---|---|
| `173` | fehlt |
| `174` | fehlt |
| `175` | vorhanden als `175_fix_users_full_name_drift` |

`public.care_consents`:

- Constraint `care_consents_feature_check` erlaubt aktuell:
  - `sos`
  - `checkin`
  - `medications`
  - `care_profile`
  - `emergency_contacts`
- `ai_onboarding` fehlt im Constraint.
- Aktuelle Rows mit `feature='ai_onboarding'`: `0`
- Table-Comment fehlt.

`public.user_memory_consents`:

- Rows: `9`
- Table-Comment fehlt.
- Aktive Policies:
  - `user_own_consents` = `ALL`
  - `caregiver_consents` = `ALL`
- Erwartete Haertung aus Mig 174 fehlt:
  - alte `caregiver_consents` entfernen
  - neue `caregiver_consents_select` als `FOR SELECT`

## Code-Abgleich

Die API-Routen sind bereits auf Senior-Self-Only gehaertet:

- `app/api/memory/consent/grant/route.ts`
- `app/api/memory/consent/revoke/route.ts`

Wenn `target_user_id !== user.id`, antworten beide mit `403 consent_self_only`.

Damit ist Mig 174 der DB-Schutzlayer passend zum bereits vorhandenen App-Layer.

## Rollback-Dry-Run

Ein kombinierter Dry-Run in einer expliziten Transaktion mit abschliessendem `rollback` wurde gegen linked Prod ausgefuehrt:

1. Transaction `begin`
2. Mig 173 ohne aeussere `begin/commit`
3. Mig 174 ohne aeussere `begin/commit`
4. Verifikations-SELECT
5. `rollback`

Ergebnis:

| Check | Ergebnis |
|---|---|
| Constraint nach Dry-Run | enthaelt `ai_onboarding` |
| alte Policy `caregiver_consents` | `0` |
| neue Policy `caregiver_consents_select` | `1` |

Dry-Run war gruen.

## Risiko

Mig 173:

- Niedrig.
- Constraint-Austausch auf `care_consents.feature`.
- Aktuell keine `ai_onboarding`-Rows, daher kein Datenkonflikt.
- Notwendig fuer `aiConsentChoice='yes'` im Onboarding, sonst Insert in `care_consents` wuerde scheitern.

Mig 174:

- Mittel, weil RLS-Policy-Aenderung.
- Richtung ist Compliance-sicherer: Caregiver duerfen Memory-Consent-Status lesen, aber nicht mehr direkt per RLS schreiben.
- Passt zum App-Code, der caregiver-on-behalf Mutationen bereits mit `403 consent_self_only` blockt.

## Empfehlung

Wenn Founder-Go fuer Prod-Migrationen gegeben wird:

1. `npx supabase db query --linked --output json -f supabase/migrations/173_memory_consents.sql`
2. `npx supabase migration repair 173 --status applied --linked --yes`
3. Verifizieren:
   - Constraint enthaelt `ai_onboarding`
   - `schema_migrations` enthaelt `173`
4. `npx supabase db query --linked --output json -f supabase/migrations/174_tighten_memory_consents_rls.sql`
5. `npx supabase migration repair 174 --status applied --linked --yes`
6. Verifizieren:
   - `caregiver_consents` fehlt
   - `caregiver_consents_select` existiert als `SELECT`
   - `schema_migrations` enthaelt `174`

Kein Push/Deploy als Teil dieses Blocks.

## Abschluss 2026-04-27

Mit Founder-Go ausgefuehrt:

1. `173_memory_consents.sql` auf linked Prod angewendet.
2. `supabase migration repair 173 --status applied --linked --yes`.
3. Verifikation 173:
   - `care_consents_feature_check` enthaelt `ai_onboarding`.
   - Table-Comment auf `care_consents` vorhanden.
   - Table-Comment auf `user_memory_consents` vorhanden.
   - `schema_migrations` enthaelt `version='173'`.
4. `174_tighten_memory_consents_rls.sql` auf linked Prod angewendet.
5. `supabase migration repair 174 --status applied --linked --yes`.
6. Verifikation 174:
   - alte Policy `caregiver_consents`: `0`.
   - neue Policy `caregiver_consents_select`: `1`, `cmd='SELECT'`.
   - Policy `user_own_consents`: weiter `ALL`.
   - `schema_migrations` enthaelt `version='174'`.

Finaler Marker-Stand:

| Version | Name |
|---|---|
| `173` | `memory_consents.down` |
| `174` | `tighten_memory_consents_rls.down` |
| `175` | `175_fix_users_full_name_drift` |

Hinweis: Die Namen fuer 173/174 haben wie zuvor bei 175 kosmetisch den `.down`-Suffix aus dem Repair-Kontext. Inhaltlich sind die Migrationen angewendet und als Versionen markiert. Eine Namensbereinigung waere ein eigener kleiner Prod-DB-Schreibblock.

Keine Push-/Deploy-Aktion in diesem Block.
