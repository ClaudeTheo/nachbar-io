# PITR-Test-Runbook fuer Thomas (Supabase Restore in neues Ziel)

**Status:** Anleitung, keine Ausfuehrung. Stand: 2026-07-04.
**Rote Zone:** Kein Restore gegen Prod, kein neues Projekt, keine Kosten ohne ausdrueckliches Founder-Go.

## Ziel

Beweisen, dass Nachbar.io im Ernstfall aus einem Supabase-Point-in-Time-Recovery wiederherstellbar ist, ohne die laufende Prod-Datenbank zu ueberschreiben.

Sicherer Testweg: **Restore to a new project** aus dem Supabase-Dashboard. Das erzeugt ein unabhaengiges Zielprojekt in derselben Region und kopiert Datenbank-Schema, Daten, Indizes, Rollen, Permissions und Auth-User-Daten. Storage-Dateien, Edge Functions, Auth-Settings/API-Keys, Realtime-Settings, DB-Extensions/Settings und Read Replicas muessen danach manuell geprueft bzw. nachgezogen werden.

Quellen:
- Supabase Database Backups/PITR: https://supabase.com/docs/guides/platform/backups
- Supabase Restore to a new project: https://supabase.com/docs/guides/platform/clone-project
- Supabase PITR usage/pricing: https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery
- Supabase Branching usage: https://supabase.com/docs/guides/platform/manage-your-usage/branching

## Kosten-/Risikovorbehalt

- PITR ist ein kostenpflichtiges Add-on und wird stuendlich abgerechnet; Supabase nennt fuer 7 Tage Retention 0,137 USD/Stunde bzw. ca. 100 USD/Monat.
- "Restore to a new project" erzeugt ein neues Projekt mit zusaetzlichen monatlichen Kosten, basierend auf gespiegelten Ressourcen des Quellprojekts. Supabase zeigt die Kosten vor dem Start an.
- Branching kann ebenfalls Compute-Kosten verursachen; fuer diesen Test ist das Dashboard-Feature "Restore to a New Project" der sauberere Weg, weil es explizit fuer physische Backups/PITR und isolierte Analyse gedacht ist.

## Vor dem Test

1. Founder-Go einholen: `PITR-TEST-GO-RESTORE-NEW-PROJECT`.
2. Prod-Projekt in Supabase oeffnen und pruefen:
   - Plan/Add-on: Paid Plan, PITR aktiv.
   - Region: EU/Frankfurt erwartet.
   - Recovery-Fenster: fruehester und letzter Restore-Punkt sichtbar.
3. Zeitpunkt waehlen:
   - Nicht "jetzt", sondern einen klaren Punkt im Recovery-Fenster, z. B. 15 Minuten vor Testbeginn.
   - Uhrzeit mit Zeitzone notieren.
4. Erwartete Verifikationswerte vorab notieren:
   - Anzahl wichtiger Tabellen: `users`, `households`, `care_profiles`, `caregiver_links`, `care_sos_alerts`, `care_audit_log`.
   - Existenz wichtiger Funktionen/Trigger/Policies: `is_care_helper_for`, `care_helper_role`, Care-Audit-Append-only-Trigger.

## Dashboard-Schritte

1. Supabase Dashboard -> Prod-Projekt `nachbar-io` oeffnen.
2. Database -> Backups -> Tab **Restore to a New Project**.
3. Fuer PITR Datum/Uhrzeit im erlaubten Recovery-Fenster auswaehlen.
4. Kosten-/Ressourcenuebersicht lesen:
   - neues Zielprojekt,
   - Compute/Disk,
   - Region,
   - eventuell Zusatzkosten.
5. Nur mit Founder-Bestaetigung fortfahren.
6. Restore starten und Startzeit notieren.
7. Warten, bis Supabase den Abschluss meldet.
8. Neue Project Ref, Name, Region und Endzeit notieren. Daraus RTO ableiten: `Endzeit - Startzeit`.

## Verifikation im neuen Ziel

Alle Checks laufen **nur** gegen das neue Restore-Projekt.

1. Dashboard-Sichtpruefung:
   - Tabellen vorhanden.
   - Auth-Users vorhanden.
   - Keine App zeigt auf das Restore-Projekt.
   - Keine Webhooks/Functions/Realtime-Jobs aktivieren.
2. Gefaehrliche externe Operationen deaktivieren, falls im Restore-Ziel vorhanden:
   - `pg_net`
   - `pg_cron`
   - Wrapper/FDW mit externen Zielen
   - sonstige Jobs, die Mails/Webhooks/Pushes ausloesen koennten
3. Read-only SQL-Checks:

```sql
select count(*) as users_count from public.users;
select count(*) as households_count from public.households;
select count(*) as care_profiles_count from public.care_profiles;
select count(*) as caregiver_links_count from public.caregiver_links;
select count(*) as care_sos_alerts_count from public.care_sos_alerts;
select count(*) as care_audit_log_count from public.care_audit_log;

select proname
from pg_proc
where proname in ('is_care_helper_for', 'care_helper_role')
order by proname;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('users', 'households', 'care_profiles', 'caregiver_links', 'care_audit_log')
order by tablename, policyname;

select event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in ('care_audit_log', 'caregiver_links', 'users')
order by event_object_table, trigger_name;
```

4. Ergebnis bewerten:
   - Schema plausibel: ja/nein.
   - Zeilenzahlen plausibel: ja/nein.
   - Care-/RLS-/Trigger-Objekte vorhanden: ja/nein.
   - Restore-Dauer/RTO: Minuten.
   - Recovery-Punkt/RPO: Abstand zwischen gewaehltem Zeitpunkt und letztem akzeptierten Stand.

## Abschluss

1. Keine App, kein Vercel, keine lokale `.env` auf das Restore-Projekt umstellen.
2. Ergebnis in `docs/plans/2026-07-04-schema-baseline-konzept.md` oder eigenem Ergebnisprotokoll nachtragen.
3. Restore-Projekt nach Verifikation loeschen, damit keine laufenden Kosten bleiben.
4. Loeschzeit und finalen Kostenstatus dokumentieren.

## Mini-Audit Pass 2026-07-04

- RLS/Trigger geprueft: Policy-Inventar-Erstlauf nur lokal; `public.spatial_ref_sys` als einzige public-Tabelle ohne RLS im lokalen Replay.
- Findings: LOW/kein Stop - `public.spatial_ref_sys` ist PostGIS-Referenztabelle ohne Nutzerdaten; keine Prod-Aenderung, keine Migration.
- Audit-Trail: n/a (kein Schreibpfad) | Rate-Limit: n/a (kein Token-/Code-Lookup)
