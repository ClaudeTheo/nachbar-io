# Codex-Uebergabe nach P4 / Stop

Stand: 2026-04-27, lokale Codex-Session

Arbeitsverzeichnis:

`C:\Users\thoma\Claud Code\Handy APP\nachbar-io`

## Wichtig

- Kein Push gemacht.
- Kein Deploy nach dem Stop gemacht.
- Prod-DB wurde in dieser Session bewusst geaendert:
  - Supabase Secret-Key-Cleanup abgeschlossen.
  - Test-Registrierung gegen Cloud-DB ausgefuehrt.
  - `schema_migrations.name` fuer Version `175` korrigiert.
  - Migrationen `173` und `174` auf linked Prod-Supabase angewendet und als applied markiert.
- Nutzer sagte danach `stop`; ab diesem Punkt keine weiteren Schreibaktionen.
- Vor weiteren Prod-Schreibaktionen wieder explizites Founder-Go einholen.

## Git-Stand

Zuletzt gesehen:

```text
master...origin/master [ahead 14]
HEAD: 603e540 Document onboarding smoke and Supabase key cleanup
```

Bekannte Working-Tree-Reste:

- `supabase/config.toml` geaendert, nicht von dieser Uebergabe bereinigen.
- diverse `.codex-*.log`
- `.playwright-cli/`
- `output/`
- alte untracked Handoffs unter `docs/plans/`
- `scripts/disable-supabase-legacy-jwts.sh`
- `scripts/rotate-twilio-oneshot.sh`

Neue / geaenderte Doku seit dem letzten lokalen Commit:

- `docs/plans/2026-04-27-p4-migrations-173-174-precheck.md`
  - neu, P4-Precheck + Abschluss dokumentiert.
- `docs/plans/2026-04-27-onboarding-pilot-test-handover.md`
  - lokal geaendert, vermutlich durch Claude parallel/kurz danach. Nicht ungeprueft ueberschreiben.
- diese Datei.

## Bereits lokal committed

Letzter Commit:

```text
603e540 Document onboarding smoke and Supabase key cleanup
```

Enthaelt:

- `docs/plans/2026-04-27-onboarding-pilot-test-handover.md`
- `docs/plans/2026-04-27-secret-key-cleanup-runbook.md`

Kein Push.

## Supabase Secret-Key-Cleanup

Erledigt mit Founder-Go:

- Vercel Production `SUPABASE_SERVICE_ROLE_KEY` kontrolliert auf v2 gesetzt.
- `vercel env update` war fuer sensitive Env Var nicht erlaubt.
- Erfolgreicher Pfad:
  - `vercel env add SUPABASE_SERVICE_ROLE_KEY production --sensitive --force --yes`
- Production redeployed aus bestehendem Deployment, nicht aus lokalem Working Tree.
- Alter Supabase Secret Key geloescht:
  - `nachbar_io_vercel_prod_20260427_codex`
- Neuer Supabase Secret Key bleibt aktiv:
  - `nachbar_io_vercel_prod_20260427_codex_v2`
- Live-Smoke nach Delete: HTTP 200.

Runbook:

`docs/plans/2026-04-27-secret-key-cleanup-runbook.md`

## Register-Smoke

Erledigt mit Founder-Go:

- lokaler Server `localhost:3001` gegen Cloud-DB.
- Kein Push, kein Deploy.
- Neuer Testnutzer:
  - User-ID: `53aaea93-2476-4978-8a2b-e0cf496506a0`
  - E-Mail: `ai-test-onboarding-codex-20260427-161944@nachbar-pilot.local`
  - Name: `AI-Test Codex-20260427-161944`
  - Haushalt: `1ee933a2-ca0c-4679-a9e8-2078ad1b55c9`
  - Invite-Code: `3WEA-VPXU`

DB-Verifikation:

- `settings.pilot_role = "test_user"`
- `settings.is_test_user = true`
- `settings.test_user_kind = "pilot_onboarding"`
- `settings.must_delete_before_pilot = true`
- `settings.pilot_approval_status = "pending"`
- `role = "resident"`
- `trust_level = "new"`
- `full_name = display_name`
- passende `household_members`-Zuordnung vorhanden.
- `aiConsentChoice="later"` erzeugte keine `care_consents`-Zeile fuer `ai_onboarding`.

Nicht loeschen ohne eigenes Loesch-Go.

## P3: schema_migrations Name fuer 175

Erledigt mit Founder-Go:

```sql
UPDATE supabase_migrations.schema_migrations
SET name = '175_fix_users_full_name_drift'
WHERE version = '175'
  AND name = 'fix_users_full_name_drift.down';
```

Verifikation:

```text
version: 175
name: 175_fix_users_full_name_drift
```

## P4: Migration 173/174

### Precheck

Datei:

`docs/plans/2026-04-27-p4-migrations-173-174-precheck.md`

Vor Apply war Prod fachlich vor 173/174:

- `care_consents_feature_check` enthielt kein `ai_onboarding`.
- Table-Comments fehlten.
- `user_memory_consents` hatte alte Policy `caregiver_consents` als `FOR ALL`.
- neue Policy `caregiver_consents_select` fehlte.

Dry-run wurde in eigener Transaktion mit Rollback gemacht und war gruen.

Wichtige Lehre:

Die Migrationsdateien selbst enthalten innere `begin;` / `commit;`. Bei kuenftigen Dry-runs mit solchen Files nicht unkritisch einen aeusseren Rollback als Sicherheitsbeweis behandeln.

### Apply

Mit Founder-Go angewendet:

```powershell
npx supabase db query --linked --output json -f "supabase\migrations\173_memory_consents.sql"
npx supabase migration repair 173 --status applied --linked --yes
npx supabase db query --linked --output json -f "supabase\migrations\174_tighten_memory_consents_rls.sql"
npx supabase migration repair 174 --status applied --linked --yes
```

### Final verifizierter Prod-State

```text
constraint_has_ai_onboarding: true
old_caregiver_policy_count: 0
new_caregiver_select_policy_count: 1
```

`schema_migrations`:

```text
173 -> memory_consents.down
174 -> tighten_memory_consents_rls.down
175 -> 175_fix_users_full_name_drift
```

Inhaltlich sind 173/174 angewendet. Die Namen fuer 173/174 haben kosmetisch `.down`-Suffix durch `migration repair`.

Nicht automatisch korrigieren: Nutzer/Claude hat nach Stop keine weiteren Prod-DB-Writes gewollt.

## Stop-Zustand

Der Nutzer schrieb `stop` nach P4-Apply/Verifikation. Danach wurde nur noch ein von Claude angeforderter Live-Read ausgefuehrt.

Live-Read bestaetigte:

- `ai_onboarding` im Constraint vorhanden.
- alter `caregiver_consents` Count: `0`.
- neuer `caregiver_consents_select` Count: `1`.
- Comments auf `care_consents` und `user_memory_consents` vorhanden.

Keine weitere Aktion danach ausser dieser lokalen Uebergabe-Datei.

## Offene Punkte

### P2: Testdaten-Cleanup vor Echt-Pilot

Nicht heute loeschen.

Betroffene bekannte Testnutzer:

- `6f3e06ce-3df2-44b0-86a6-567e87bb0e2c`
- `53aaea93-2476-4978-8a2b-e0cf496506a0`

Vor echtem Pilotbetrieb nur nach Dry-Run und explizitem Loesch-Go.

### P4 kosmetisch: schema_migrations Namen 173/174

Offen:

- `173 -> memory_consents.down`
- `174 -> tighten_memory_consents_rls.down`

Funktional unkritisch. Wenn gewuenscht, eigener kleiner Prod-DB-Schreibblock mit explizitem Go.

### P5: Vercel Env `\n`-Escapes

Separater Hygiene-Block. Heute nicht anfassen.

### Push/Deploy

Weiterhin kein Push zu `origin master` und kein Deploy ohne ausdrueckliches Founder-Go.

## Naechste sinnvolle Session

1. Diese Datei lesen.
2. `git status --short --branch` lesen.
3. P4-Doku pruefen:
   - `docs/plans/2026-04-27-p4-migrations-173-174-precheck.md`
4. Entscheiden, ob nur Doku lokal committed wird:
   - wahrscheinlich sinnvoll: P4-Doku + diese Uebergabe, aber vorher `docs/plans/2026-04-27-onboarding-pilot-test-handover.md` Diff ansehen, weil dort lokale Aenderungen von Claude liegen koennen.
5. Keine weiteren Prod-DB-Schreibaktionen ohne neues Founder-Go.

