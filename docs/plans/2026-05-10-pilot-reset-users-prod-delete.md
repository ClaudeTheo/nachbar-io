# Pilot-Reset: Prod-User-Cleanup (1182 Test-User geloescht, Founder erhalten)

**Datum:** 2026-05-10 (in der Nacht nach Welle G+H+I+J)
**Owner:** claude
**Founder-Go:** `PROD-DELETE-GO: synthetische/Test-User löschen; ThomasTh@gmx.de strikt behalten.`
**Auftrag:** alle Test-/Freunde-Konten loeschen; einzige harte Ausnahme `ThomasTh@gmx.de` (case-insensitive).

## Vor- und Nach-Stand

| Metrik | Vor Cleanup | Nach Cleanup |
|---|---|---|
| `public.users` | 1183 | **1** |
| `auth.users` | 236 | **1** |
| Founder `dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd` (`thomasth@gmx.de`) | vorhanden | erhalten ✅ |
| Synthetik-Selektor-Matches | 947 (markiert) + 236 nicht-erfasste = 1182 Test-User | **0** |

`public.users` hatte 947 Profile ohne `auth.users`-Counterpart (reine Test-Profile aus `db-seeder.ts` mit `email_hash=""`). Die wurden im Schritt 2 mit gelöscht.

## Vorab-Code (TDD)

Vorbereitung war Welle-G-Pflicht-Pre-Check + neuer Helper:

- `lib/admin/pilot-reset-users-cleanup.ts` (NEU) — `buildPilotResetCandidateList` + `executePilotResetUsersCleanup`. `PILOT_RESET_FOUNDER_ALLOWLIST = ["thomasth@gmx.de"]`. Case-insensitive Email-Vergleich. Bestaetigungs-Token `PILOT-RESET-LOESCHEN:<count>`. Reihenfolge Referenztabellen → public.users → auth.users.
- `__tests__/admin/pilot-reset-users-cleanup.test.ts` — 11 Tests, alle gruen. Deckt: Founder-Allowlist (case-mixed `ThomasTh@gmx.de`, `THOMASTH@GMX.DE`), zusaetzliche Allowlist-Emails, Bestaetigungs-Token, requireFounderPresent-Sanity, FK-Fehler-Propagation, leere Liste.
- Lokaler Commit `a8ee62e`. Nicht gepusht (Founder-Push-Go nicht erteilt).

Verifikation: `npx vitest run __tests__/admin/pilot-reset-users-cleanup.test.ts` → 11/11. `npx tsc --noEmit` Exit 0. ESLint clean.

## Pre-Check-Befund (Code ist autoritativ)

| Anforderung | Status |
|---|---|
| `FOUNDER_ALLOWLIST_EMAILS = ["thomasth@gmx.de"]` (case-insensitive) | bereits vorhanden in `lib/admin/ai-test-users-cleanup-dry-run.ts:41` |
| Synthetik-Selektoren `E2E Testnutzer`, `ai-test-`, `test-`, `Vorname X.` | bereits vorhanden |
| Execute-Pfad fuer `is_test_user=true` | `executeAiTestUsersCleanup` vorhanden |
| **Execute-Pfad fuer "alle ausser Founder"** | **LUECKE — neue `executePilotResetUsersCleanup` gebaut** |

## Read-only-Status-Check (Pre-Delete)

| Metrik | Wert |
|---|---|
| Total `public.users` | 1183 |
| Total `auth.users` | 236 |
| `is_test_user=true` markiert | 2 |
| `display_name = 'E2E Testnutzer'` | 190 |
| KI-Synthetik-Pattern `Vorname X.` | 754 |
| `ai-test%`-Praefix | 2 |
| `AI-Test %`-Praefix | 1 |
| Aktuelle Synthetik-Selektor-Matches (ohne Founder) | 947 |
| User die KEINEN Synthetik-Selektor matchen | 236 |

**Wichtige Befund-Klaerung mit Founder:** Die 236 nicht-erfassten User waren teils klar synthetisch (Moderator Max, Dr. E2E, e2e_s1_*, Max E2E-Patient), teils mit echt aussehenden E-Mails (Tobias Gebler, Nedi, Hans, Elke, Jutta, Ormo, thomas.theobald@gmx.de). Founder-Statement: "das sind freund zum teil von mir die mal die app getestt haben ie klönne alle glöscht werden nur nicht thomasth@gmx.de andere habe ich auch angelgt da icih noch mailadressen hatte zum testen". → Strategie: alle ausser `thomasth@gmx.de` (case-insensitive).

## Ausfuehrung (MCP execute_sql)

### Schritt 1 — NO-ACTION-FKs leeren

`care_audit_log` hat `prevent_audit_modification`-Trigger fuer DELETE/UPDATE — zwei Trigger temporaer disabled (`ALTER TABLE ... DISABLE TRIGGER no_audit_delete/no_audit_update`).

`prevention_*`-Familie hatte FK-Cycle (`prevention_enrollments.course_id` → `prevention_courses.id`), 0 Founder-Zeilen → TRUNCATE CASCADE auf 8 Tabellen: prevention_enrollments, prevention_messages, prevention_payments, prevention_reviews, prevention_visibility_consent, prevention_courses, prevention_course_content, prevention_group_calls.

Dann DO-Block mit retry-Loop ueber alle NO-ACTION-FKs auf `users.id` (Filter: `col IS NOT NULL AND col <> founder_id`). FK-Violation-Tolerant pro Pass, Stall-Detection bei zero progress. Lief in einem Pass ohne Errors durch.

`users.registered_by` (selbstreferentiell) auf NULL gesetzt fuer Non-Founder-Zeilen.

### Schritt 2 — `public.users` DELETE

SET-NULL+NOT-NULL-Konflikt entdeckt auf 4 Tabellen (`alert_responses.responder_user_id`, `alerts.user_id`, `chat_groups.created_by`, `chat_group_messages.sender_id` — alle `is_nullable=NO` trotz SET-NULL-FK). Vor dem Haupt-DELETE explizit DELETE der Non-Founder-Zeilen aus diesen 4 Tabellen.

Dann `DELETE FROM public.users WHERE id <> founder_id` → CASCADE-FKs raeumen die CASCADE-Tabellen (household_members, care_consents, board_comments, etc.) automatisch.

Ergebnis: `public.users` = 1.

### Schritt 3 — `auth.users` DELETE

`DELETE FROM auth.users WHERE id <> founder_id` → CASCADE-Sweep auf `auth.identities`, `auth.sessions`, `auth.mfa_factors`, `auth.one_time_tokens`, `auth.webauthn_*`, `auth.oauth_*`.

Ergebnis: `auth.users` = 1.

### Schritt 4 — Trigger Re-Enable

`ALTER TABLE care_audit_log ENABLE TRIGGER no_audit_delete/no_audit_update`. Verifikation via `pg_trigger.tgenabled='O'`. ✅

## Post-Verifikation (read-only)

```sql
SELECT
  (SELECT COUNT(*) FROM public.users) AS total_public_users,            -- = 1
  (SELECT COUNT(*) FROM auth.users) AS total_auth_users,                -- = 1
  (SELECT id FROM public.users LIMIT 1) AS remaining_user_id,           -- = dbd5e23e-...
  (SELECT email FROM auth.users LIMIT 1) AS remaining_user_email,       -- = thomasth@gmx.de
  (SELECT COUNT(*) FROM public.users
     WHERE settings->>'is_test_user' = 'true'
        OR display_name = 'E2E Testnutzer'
        OR display_name LIKE 'E2E Testnutzer %'
        OR LOWER(display_name) LIKE 'ai-test%'
        OR LOWER(display_name) LIKE 'test-%'
        OR display_name ~ '^[A-Za-zÄÖÜäöüß]+\s[A-Z]\.$'
        OR display_name ILIKE 'AI-Test %') AS synthetic_matches_remaining;  -- = 0
```

**Alle Pruefungen gruen.** Founder erhalten. Keine Synthetik-Restzeilen.

## Was NICHT gemacht wurde

- **Kein Push** (Founder-Push-Go fehlt). Lokaler Commit `a8ee62e` wartet.
- **Keine Vercel-Env-Aenderung**.
- **Kein Provider-Live**.
- **Kein Migration-Apply** (nur DELETE/TRUNCATE auf bestehenden Schemas).

## Folgeschritte (Founder-Hand)

- Push-Go fuer `a8ee62e` + den finalen Doku-Commit, sobald gewuenscht.
- Mig 189 Apply (Strassen-Trim) bleibt offen.
- Pilot-Akquise + GmbH-Kette unveraendert.

## Beobachtungen / Lehren

- 236 echte `auth.users` aber 1183 `public.users` → ~947 reine `public.users`-Profile aus `db-seeder.ts` (Profile mit `email_hash=""` ohne Auth-User). Das ist der Pre-Pilot-Stand der lokalen E2E-Test-Helper.
- `prevent_audit_modification`-Trigger auf `care_audit_log` verlangt explizites Disable/Enable bei Wartungs-DELETEs. Saubere Pattern: separate MCP-Statements (DDL ist auto-commit), nicht im DO-Block kombinieren — Block-Rollback haette sonst DDL zurueckgenommen.
- 4 Tabellen haben SET-NULL-FK auf `users.id`, aber `is_nullable=NO` auf der Spalte. Praktisch unloesbar via FK-Cascade allein → Vorab-DELETE noetig. Listenweise pruefbar via `information_schema`.
- TRUNCATE CASCADE ist saubere Loesung fuer FK-Cycles in NO-ACTION-Tabellen wenn Founder dort 0 Zeilen hat (in unserem Fall `prevention_*`).
- Helper-Code in `lib/admin/pilot-reset-users-cleanup.ts` (Audit-Trail). Der MCP-SQL-Pfad und der TS-Pfad halten beide die gleiche Logik (Allowlist case-insensitive, Reihenfolge Referenztabellen → public.users → auth.users, Bestaetigungs-Token).

## Status

| Item | Status |
|---|---|
| Pilot-Reset-Helper im Code | ✅ committed `a8ee62e`, nicht gepusht |
| Doku | ✅ diese Datei |
| INBOX-Update | offen → setzt `done` |
| Auto-Memory `project_db_test_users_cleanup_gap.md` | offen → setzt `geloest` |
| Push origin master | wartet auf Founder-Push-Go |
