# Audit-Log-Smoke-Test Bericht

Datum: 2026-04-30
Block: G3
Status: erfolgreich

## Ziel

Browser-Smoke fuer den Admin-Audit-Log-Reader auf `http://localhost:3000/admin`:

- Empty-State vor dem ersten Toggle pruefen.
- Zwei bis drei Feature-Flags togglen.
- Audit-Log-Eintraege fuer Zeit, Flag-Key, Aktion, vorher/nachher, Wer und Reason pruefen.
- Flag-Key-Filter pruefen.
- Screenshots unter `docs/plans/2026-04-30-audit-log-smoke-test-screenshots/` ablegen.

## Pre-Check

- `app/(app)/admin/components/FeatureFlagAuditLog.tsx` existiert.
- `supabase/migrations/176_feature_flags_audit_log.sql` existiert.
- Migration 176 legt `public.feature_flags_audit_log`, `last_change_reason`, RLS-Select fuer Admins und den Trigger `feature_flags_audit_log_trigger` an.
- `FeatureFlagAuditLog.tsx` liest die letzten 50 Eintraege aus `feature_flags_audit_log`, zeigt Loading-Skeleton, Empty-State und Flag-Key-Filter.

## Ausfuehrung

T0: 2026-04-30 18:04 +02:00

1. Lokalen Supabase-Stack fuer dieses Repo gestartet und Replay-Blocker im lokalen Migrationslauf behoben.
2. Migrationen bis 178 lokal replayed, Seed erfolgreich ausgefuehrt.
3. Lokalen Admin-Testnutzer im lokalen Stack vorbereitet.
4. `npm run dev` gegen den lokalen Supabase-Stack gestartet.
5. Admin-Dashboard unter `http://localhost:3000/admin` im Browser geoeffnet.
6. Empty-State des Audit-Log-Readers vor Toggle-Eintraegen geprueft.
7. Reason-Feld mit `G3 lokaler Audit-Log-Smoke` befuellt.
8. Drei Feature-Flags im Browser getoggelt:
   - `CARE_ACCESS_FAMILY`: `FALSE -> TRUE`
   - `AI_PROVIDER_OFF`: `TRUE -> FALSE`
   - `BILLING_ENABLED`: `FALSE -> TRUE`
9. Audit-Log-Reader erneut geprueft.
10. Flag-Key-Filter mit `BILLING` geprueft.

## Funktioniert

- Der Trigger aus Migration 176 schreibt pro Toggle einen Audit-Eintrag.
- Der Reader zeigt die drei neuen Eintraege absteigend nach Zeit an.
- Spalten sind korrekt befuellt:
  - Zeitstempel
  - Flag-Key
  - Aktion-Badge `update`
  - vorher/nachher
  - Wer
  - Reason
- Empty-State und Loading-Skeleton sind vorhanden.
- Der Filter reduziert bei `BILLING` auf `BILLING_ENABLED`.

## Gefundene und behobene Bugs

1. Lokaler Supabase-Replay stoppte vor Migration 176 durch mehrere historische Drift-/Replay-Probleme.
   - Behebung: lokale Migrationen idempotenter gemacht, doppelte Up-Versionen zusammengefuehrt und Rollback-Dateien aus dem Up-Migrationsordner verschoben.
2. `supabase/seed.sql` war nicht mehr kompatibel mit dem aktuellen Schema.
   - Behebung: Pilot-Quarter vor Households gesichert, `quarter_id` gesetzt und User-Rollen an `users_role_check` angepasst.
3. Browser-CSP blockierte lokale Supabase-Requests.
   - Behebung: `next.config.ts` erlaubt lokale Supabase-HTTP/WS-Ziele nur im Development-Modus.
4. Audit-Reader verwendete einen PostgREST-FK-Join auf `users`, obwohl Migration 176 `changed_by` auf `auth.users(id)` referenziert.
   - Behebung: Audit-Log wird ohne FK-Join geladen; die Anzeige fuer `Wer` wird separat ueber `public.users` per `changed_by` IDs angereichert.

## Screenshots

- Empty-State: `docs/plans/2026-04-30-audit-log-smoke-test-screenshots/empty-state.png`
- Drei Eintraege: `docs/plans/2026-04-30-audit-log-smoke-test-screenshots/with-entries.png`
- Reason + Filter: `docs/plans/2026-04-30-audit-log-smoke-test-screenshots/with-reason.png`

## Empfehlung

Rollout-ready fuer den lokal verifizierten Audit-Log-Reader. Migration 176 bleibt weiterhin nur als Datei/lokaler Commit vorhanden und wurde nicht auf Prod appliziert.

Keine Prod-Migration, kein Prod-Write, kein Vercel-Deploy und kein `git push` wurden ausgefuehrt.
