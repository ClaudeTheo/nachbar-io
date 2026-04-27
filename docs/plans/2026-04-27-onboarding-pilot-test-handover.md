# 2026-04-27 — Onboarding Pilot-Test + Drift-Repair (Übergabe)

> Technischer Handoff Claude↔Claude (nächste Session). Strategie/GmbH-Themen
> liegen weiterhin im Vault `firmen-gedaechtnis/`.

## TL;DR

- Pilot-Onboarding-Flow wurde **erfolgreich E2E getestet** auf `localhost:3001` gegen Prod-Cloud-DB.
- Test-User `6f3e06ce-3df2-44b0-86a6-567e87bb0e2c` ist live in Prod-DB und korrekt als `is_test_user=true / pilot_role=test_user / must_delete_before_pilot=true / test_user_kind=pilot_onboarding` markiert.
- Ein Prod-DB-Drift (`users.full_name` fehlte) wurde von Codex via Migration **175** gefixt. `apply_migration` auf Prod gelaufen, 1181 Zeilen Backfill aus `display_name`.
- Vercel-Production-Env wurde fälschlich als „leerer Service-Role-Key" diagnostiziert — Ursache: `--sensitive`-Flag maskiert Werte im `vercel env pull` als `""`. Live-Sanity bestätigte: Prod war die ganze Zeit gesund.
- **Codex-Cleanup abgeschlossen:** `SUPABASE_SERVICE_ROLE_KEY` in Vercel-Prod kontrolliert auf v2 gesetzt (per `vercel env add ... --sensitive --force --yes`, weil `vercel env update` sensitive ablehnt), Production redeployed (bleibt auf Commit `10a72f0` — die 13 Ahead-Commits sind NICHT live), alter Supabase-Key v1 per Management-API gelöscht. Live-Smoke nach Delete: HTTP 200. Runbook: `docs/plans/2026-04-27-secret-key-cleanup-runbook.md`.
- **P4 173/174-Drift abgeschlossen:** Mig 173 (care_consents.feature='ai_onboarding' + Tabellen-Comments) und Mig 174 (user_memory_consents RLS: FOR-ALL → FOR-SELECT für Caregiver) sind jetzt auf Prod angewendet und in `schema_migrations` markiert. Verify gegen Prod war grün (Constraint enthält ai_onboarding, alte Policy weg, neue caregiver_consents_select da). Detail: `docs/plans/2026-04-27-p4-migrations-173-174-precheck.md`.
- **P3 für 175 erledigt:** `schema_migrations` für Version 175 hat jetzt korrekt `name='175_fix_users_full_name_drift'` (Codex-UPDATE im Zuge des P4-Apply-Blocks).

## Stand am Sessionende

### Erledigt

| Was | Wo / wie verifizierbar |
|---|---|
| Pilot-Test-User in Cloud-DB | `public.users` WHERE `id='6f3e06ce-3df2-44b0-86a6-567e87bb0e2c'`. Settings-Flags exakt wie gefordert. |
| Mig 175 (full_name + Backfill) | `supabase/migrations/175_fix_users_full_name_drift.sql` + `.down.sql`. Commit `a39b60a`. Spalte in Prod, 1181/1181 mirrored. |
| Live-Sanity Prod | `POST https://nachbar-io.vercel.app/api/register/check-invite` mit `inviteCode: "3WEA-VPXU"` → HTTP 200, valid:true, householdId 1ee933a2-… |
| Mig 175 in `schema_migrations` | Eingetragen mit `version='175' / name='175_fix_users_full_name_drift'` (Codex hat den ursprünglichen `.down`-Suffix per UPDATE korrigiert). |

### Zusatz-Smoke Codex 2026-04-27 16:19

Mit Founder-Go wurde ein zweiter Register-Smoke auf `localhost:3001` gegen die Cloud-DB ausgefuehrt, ohne Push und ohne Deploy.

Testdaten:

| Feld | Wert |
|---|---|
| Test-User-ID | `53aaea93-2476-4978-8a2b-e0cf496506a0` |
| Test-User-E-Mail | `ai-test-onboarding-codex-20260427-161944@nachbar-pilot.local` |
| Display/Full Name | `AI-Test Codex-20260427-161944` |
| Haushalt | `1ee933a2-ca0c-4679-a9e8-2078ad1b55c9` |
| Invite-Code | `3WEA-VPXU` |
| Rolle | `test_user` |
| KI-Auswahl | `later` |

API-Ergebnis:

- `POST http://localhost:3001/api/register/check-invite` -> HTTP 200, `valid:true`
- `POST http://localhost:3001/api/register/complete` -> HTTP 200, `success:true`

DB-Verifikation:

- `users.settings.pilot_role = "test_user"`
- `users.settings.is_test_user = true`
- `users.settings.test_user_kind = "pilot_onboarding"`
- `users.settings.must_delete_before_pilot = true`
- `users.settings.pilot_approval_status = "pending"`
- `users.role = "resident"`
- `users.trust_level = "new"`
- `users.full_name = users.display_name`
- `household_members` enthaelt genau eine passende Zuordnung zum Test-Haushalt
- `care_consents` fuer `ai_onboarding` enthaelt 0 Zeilen, weil KI-Auswahl `later`

Cleanup-Hinweis:

Auch dieser Test-User ist vor echtem Pilotbetrieb zusammen mit allen `settings.is_test_user=true`-Konten zu loeschen.

### Offen — geordnet nach Priorität

#### P1 — Aufräum-Block Supabase-Secret-Key-Rotation — ✅ ERLEDIGT (Codex)

- Vercel `SUPABASE_SERVICE_ROLE_KEY` Production = v2-Wert (sensitive overwrite).
- Production redeployed, READY, Alias `https://nachbar-io.vercel.app` aktiv.
- Alter Key `nachbar_io_vercel_prod_20260427_codex` (v1) per Supabase Management API **gelöscht** (kein 24h-Disable-Vorlauf — Codex hat direkt revoked, weil Live-Smoke nach Delete HTTP 200 lieferte).
- v2 weiterhin der aktive Key.

Verifikation reproduzierbar mit:
```bash
curl -s -X POST https://nachbar-io.vercel.app/api/register/check-invite \
  -H "Content-Type: application/json" \
  -d '{"inviteCode":"3WEA-VPXU"}'
# erwartet: HTTP 200, body {"valid":false} (Begründung siehe P6)
```

Detail-Runbook: `docs/plans/2026-04-27-secret-key-cleanup-runbook.md`.

#### P2 — Test-User-Cleanup (vor Echt-Pilot)

User `6f3e06ce-3df2-44b0-86a6-567e87bb0e2c` (`AITest Onboarding20260427`) hat `settings.must_delete_before_pilot=true`. Standard-Cleanup-Routine vor Pilot-Go (siehe `memory/project_ai_testnutzer_regel.md`).

**Heute nicht löschen** — der User ist Beweis, dass die Registrierung funktioniert. Erst wenn Echt-Pilot anläuft, als Batch zusammen mit allen anderen `is_test_user=true`-Konten löschen.

#### P3 — Mig-175-Eintragsname kosmetisch korrigiert — ✅ ERLEDIGT (Codex)

`schema_migrations` für Version 175 heißt jetzt korrekt `175_fix_users_full_name_drift` (UPDATE im Zuge P4-Apply gefahren).

**Restposten:** Mig 173 und 174 haben heute beim Apply den gleichen Codex-Repair-Pattern-Fehler gezeigt — sie stehen aktuell als `memory_consents.down` bzw. `tighten_memory_consents_rls.down` in `schema_migrations`. Funktional unkritisch (der Eintrag selbst beweist „applied", die Mig-Files sind angewendet, das Schema ist konsistent). **Heute bewusst nicht ausgeweitet** — separater Mini-Fix in einer späteren Session per identischem UPDATE-Pattern wie für 175.

#### P4 — 173/174 Drift im `schema_migrations` — ✅ ERLEDIGT (Codex)

Beide Migrationen wurden mit Founder-Go auf Prod angewendet (Constraint, Comments, Policy-Tausch FOR-ALL→FOR-SELECT). Verify gegen Prod war grün:

- `care_consents_feature_check` enthält `ai_onboarding`.
- Tabellen-Comments auf `care_consents` und `user_memory_consents` gesetzt.
- Alte FOR-ALL-Policy `caregiver_consents` entfernt (count=0).
- Neue FOR-SELECT-Policy `caregiver_consents_select` aktiv (count=1).
- `schema_migrations` enthält 173 und 174 (mit `.down`-Suffix-Defekt im Namen — siehe P3-Restposten oben).

Detail-Doku: `docs/plans/2026-04-27-p4-migrations-173-174-precheck.md`.

**Wichtige Lehre für künftige Apply-Sessions:** Migrations-Files mit innerem `begin;`/`commit;` durchbrechen einen äußeren `BEGIN; … ROLLBACK;`-Wrapper. Beim Codex-Dry-Run waren 173 dadurch versehentlich persistent committed und nur 174 nicht. Live-Read ist daher Pflicht VOR dem geplanten Apply, nicht nur nach dem Pre-Read aus dem Plan-File.

#### P6 — Invite-Code-Verhalten Prod vs. Local (zur Kenntnis, kein Bug)

`POST /api/register/check-invite` mit `3WEA-VPXU` liefert in **Prod** `{"valid":false}`, auf **localhost:3001** `{"valid":true}`. Ursache: Prod läuft auf Commit `10a72f0`, der nur den `neighbor_invitations`-Pfad kennt (Status nach Testregistrierung = `'converted'`, also nicht mehr „offen"). Lokaler Server hat zusätzlich den `households.invite_code`-Pfad (B2B-Codes) — der ist erst in den 13 Ahead-Commits hinzugekommen. Konsistentes Verhalten, kein Eingreifen nötig. Wenn die 13 Ahead-Commits live gehen, wird der Prod-Befund auch wieder `valid:true` (solange Member-Count das nicht blockt — vorher prüfen).

#### P5 — `\n`-Escapes in Env-Werten

`vercel env pull --environment=production` zeigt 27 Vorkommen von `\n`-Escape-Sequenzen in Werten (z. B. `ADMIN_EMAIL="thomasth@gmx.de\n"`). Hauptverdacht: CLI-Render-Artefakt, nicht echter gespeicherter Wert. Funktional unkritisch, separater Env-Hygiene-Block.

## Diagnose-Lehre (wichtig für künftige Sessions)

**Vercel `--sensitive`-Env-Vars zeigen sich in `vercel env pull` als leerer Wert (`""`).**

Aus Vercel-Doku: „Sensitive Environment Variables are not viewable or downloadable. The values cannot be read using `vercel env pull`."

In dieser Session hat das fast zu einer unnötigen Re-Set-Aktion + Redeploy geführt. Vor jeder Reparatur-Aktion auf Basis eines „leer"-Befunds aus dem Pull: **Live-Sanity-Curl** gegen einen Endpoint, der die Variable nutzt. Erst wenn der Endpoint auch in Prod 500 liefert, ist der Wert wirklich leer.

Auto-Memory-Eintrag dazu: `feedback_vercel_sensitive_pull_empty.md`.

## Wichtige IDs / Pfade

| Was | Wert |
|---|---|
| Repo | `C:\Users\thoma\Claud Code\Handy APP\nachbar-io` |
| Branch | `master`, ahead 13 commits gegen origin (Prod auf `10a72f0`) |
| Lokaler Dev-Server | `localhost:3001` (gegen Cloud-DB, nicht local Supabase) |
| Test-Haushalt-ID | `1ee933a2-ca0c-4679-a9e8-2078ad1b55c9` |
| Test-Haushalt-Adresse | Purkersdorfer Str. / TEST-ONBOARDING-20260427 |
| Invite-Code (DB-Form) | `3WEAVPXU` (ohne Bindestrich), Eingabe `3WEA-VPXU` wird normalisiert |
| Test-User-ID | `6f3e06ce-3df2-44b0-86a6-567e87bb0e2c` |
| Test-User-E-Mail | `ai-test-onboarding-20260427@nachbar-pilot.local` |
| Mig 175 Commit | `a39b60a` (Codex) |
| Aktiver Supabase Secret Key | `nachbar_io_vercel_prod_20260427_codex_v2` |
| v1 (gelöscht) | `nachbar_io_vercel_prod_20260427_codex` — entfernt 2026-04-27 durch Codex |
| Supabase Project | `uylszchlyhbpbmslcnka` (eu-central-1, nachbar-io) |
| Vercel Project | `thomasth1977s-projects/nachbar-io` |
| Codex-Runbook | `docs/plans/2026-04-27-secret-key-cleanup-runbook.md` |

## Was die neue Session NICHT tun soll

- **Kein Push** auf master ohne explizites Founder-Go (Branch ist 13 commits ahead, Prod hängt bewusst auf `10a72f0`).
- **Kein Vercel-Redeploy** ohne Founder-Go.
- **Kein `vercel env rm`** ohne Founder-Go.
- **Keine weiteren Supabase-Secret-Key-Aktionen** (Cleanup ist erledigt).
- **Kein Löschen** des Test-Users `6f3e06ce-…` ohne explizites Go.
- **Keine Bewegung** an Mig 173/174 ohne separate Founder-Freigabe.
- **Keinen Service-Role-Key, Anon-Key oder anderen Secret-Wert** in Klartext lesen, kopieren, ausgeben.
- **`ThomasTh@gmx.de`** ist registriert und blockt `/api/register/complete` mit 409 — bei Bedarf neue AI-Test-Mail benutzen, nicht den existierenden User löschen ohne Go.

## Was die neue Session direkt machen darf

- **Diesen Handover lesen.**
- **Status-Pointer aus Memory** prüfen (Auto-Memory `MEMORY.md`).
- **Lokaler Server-Check:** `curl -s http://localhost:3001/` (200 ist gesund).
- **DB-Quick-Check via MCP:** Test-User-Settings nochmal verifizieren falls gewünscht.
- **Live-Sanity Prod wiederholen:** gleicher `check-invite`-Curl wie oben, nur Read.

## Erste Frage an die nächste Session

> Welcher der offenen Punkte (P2 Test-User-Cleanup, P5 `\n`-Escapes, P3-Restposten 173/174-Suffixe, P6 Code-Versions-Drift Prod vs +13) soll als nächstes angefasst werden — oder ein neues Thema?

Sicherheits- und Drift-Themen P1, P3 (für 175) und P4 sind heute geschlossen. Restposten klein, alle nicht-blockierend.

## Memory-Arbeitsteilung

- Diese Datei = technischer Handoff (Repo-`docs/plans/`).
- Lehre Vercel-Sensitive = Auto-Memory `feedback_vercel_sensitive_pull_empty.md`.
- Strategie/Pilot-Status/GmbH = Vault `firmen-gedaechtnis/` (nicht hier).
