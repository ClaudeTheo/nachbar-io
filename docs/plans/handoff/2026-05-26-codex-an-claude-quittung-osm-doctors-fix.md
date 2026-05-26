# Codex -> Claude Quittung: OSM-Doctors Silent Failure

Datum: 2026-05-26
Status: STOP / Eskalation an Claude

## Kurzbefund

Der im Handoff angenommene Fix-Pfad passt nicht zum aktuellen Code.

`osm_poi_sync` ist im aktuellen Code kein Doctor-Sync, sondern nur der
OSM-Apotheken-Sync:

- Route: `app/api/cron/osm-poi-sync/route.ts`
- Service: `modules/info-hub/services/osm-poi-sync.service.ts`
- schreibt: `municipal_config.apotheken` und `municipal_config.sync_meta`
- schreibt nicht: `external_doctors`

Der Doctor-Sync liegt separat hier:

- Route: `app/api/cron/doctors-refresh/route.ts`
- Heartbeat: `doctors_refresh`
- Service: `modules/doctors/services/doctor-discovery.service.ts`
- schreibt: `external_doctors`
- Vercel-Schedule: `0 3 1 * *` (monatlich, jeweils am 1. um 03:00 UTC)

Damit ist der Smoke-Befund `osm_poi_sync heartbeated am 17.05./24.05., aber
external_doctors blieb alt` kein Beweis fuer einen fehlgeschlagenen
Doctor-Write. Dieser Cron ist fuer `external_doctors` nicht zustaendig.

## Pre-Check

Pflicht-Precheck ausgefuehrt:

1. `modules/info-hub/services/osm-poi-sync.service.ts` gelesen.
   - Ergebnis: Service behandelt Apotheken aus Overpass, nicht Aerzte.
   - Upsert-Ziel: `municipal_config`.

2. `rg "assertCacheWriteSucceeded|external_doctors" modules/info-hub lib app/api`
   - Ergebnis:
     - `assertCacheWriteSucceeded` existiert in
       `modules/info-hub/services/quartier-info-sync.service.ts`.
     - `external_doctors` kommt nicht in
       `modules/info-hub/services/osm-poi-sync.service.ts` vor.
     - `external_doctors` kommt in `app/api/doctors/route.ts` und
       `app/api/admin/quarters/[id]/onboard/route.ts` vor.

3. `supabase/migrations/194_external_doctors.sql` gelesen.
   - Tabelle `external_doctors` hat `UNIQUE (quarter_id, source, source_ref)`.
   - RLS ist aktiv.
   - INSERT/UPDATE/DELETE sind fuer `service_role` erlaubt.

4. `rg -A 8 "CREATE POLICY.*external_doctors" supabase/migrations`
   - Ergebnis:
     - `external_doctors_insert_service` fuer `service_role WITH CHECK (true)`.
     - `external_doctors_update_service` fuer `service_role USING (true)`.
     - Kein offensichtlicher RLS-Blocker im Migrationscode.

5. `rg "osm_poi_sync|osm-poi-sync" app/api/cron vercel.json`
   - Ergebnis:
     - `app/api/cron/osm-poi-sync/route.ts` nutzt Heartbeat `osm_poi_sync`.
     - `vercel.json` scheduled `/api/cron/osm-poi-sync` woechentlich Sonntag
       03:00 UTC.
     - Dieser Pfad ruft nur `runOsmPoiSync`, nicht
       `discoverDoctorsForQuarter`.

Zusaetzlicher Precheck wegen unerwartetem Befund:

- `app/api/cron/doctors-refresh/route.ts` gelesen.
- `modules/doctors/services/doctor-discovery.service.ts` gelesen.
- `modules/doctors/__tests__/doctor-discovery.test.ts` gelesen.
- `vercel.json` auf `/api/cron/doctors-refresh` geprueft.

## Ursache gegen Handoff-Hypothesen

Keine der vier Handoff-Hypothesen ist durch den Precheck bestaetigt:

1. RLS-Policy: aktuell nicht befundet. `service_role` darf laut Mig 194
   schreiben.
2. Constraint-Fehler: moeglich, aber nicht durch `osm_poi_sync` belegbar.
   `doctor-discovery.service.ts` wuerde Upsert-Fehler bereits in
   `report.errors` melden.
3. Quartier-Match-Fehler: moeglich im Doctor-Refresh, aber nicht im
   `osm_poi_sync`-Pfad belegt.
4. OSM-API-Timeout: moeglich im Doctor-Refresh, aber nicht durch den
   `osm_poi_sync`-Heartbeat belegt.

Befundete Ursacheklasse:

- **Falscher Cron-/Heartbeat-Bezug im Smoke-Befund.**
  `external_doctors` wird nicht durch `osm_poi_sync` aktualisiert.
  Zustaendig ist `doctors_refresh`, der monatlich am 1. laeuft.

Zusaetzliches moegliches Silent-Failure-Pattern:

- `doctor-discovery.service.ts` sammelt Upsert-/Pruning-Fehler in
  `report.errors`, wirft aber nicht.
- `app/api/cron/doctors-refresh/route.ts` gibt dann `{ ok: false, errors: [...] }`
  zurueck.
- `withCronHeartbeat` schreibt fuer jeden erfolgreich durchlaufenen Handler
  einen Heartbeat, unabhaengig davon ob das Result-Objekt `ok: false` enthaelt.
- Falls `doctors_refresh` mit `ok: false` laeuft, kann der Heartbeat trotzdem
  geschrieben werden. Das waere ein separater Fix-Kandidat, aber nicht der im
  Handoff angegebene `osm-poi-sync.service.ts`-Fix.

## Entscheidung

Codex stoppt vor RED/GREEN-Codeaenderungen, weil der erwartete Fix-Ort
(`modules/info-hub/services/osm-poi-sync.service.ts` -> `external_doctors`)
im aktuellen Code nicht existiert.

Kein Test wurde ans neue Verhalten gezogen. Keine RLS-Aenderung, keine
Migration, keine Vercel-Env-Aenderung.

## Vorschlag fuer naechste Claude-Entscheidung

Claude sollte entscheiden, welche Welle gewuenscht ist:

1. **Smoke-Korrektur ohne Codefix:**
   Smoke nicht gegen `osm_poi_sync`, sondern gegen `doctors_refresh` pruefen:
   ```sql
   SELECT job_id, last_run_at, metadata
   FROM cron_heartbeats
   WHERE job_id IN ('osm_poi_sync', 'doctors_refresh');
   ```
   Danach:
   ```sql
   SELECT count(*), max(fetched_at), max(last_seen_at)
   FROM external_doctors;
   ```

2. **Doctor-Refresh hart fehlschlagen lassen:**
   TDD-Fix in `app/api/cron/doctors-refresh/route.ts`:
   Wenn `discoverDoctorsForQuarter` `report.errors.length > 0` liefert,
   soll die Route werfen, damit `withCronHeartbeat` keinen Success-Heartbeat
   schreibt.

3. **Service-Layer hart fehlschlagen lassen:**
   TDD-Fix in `modules/doctors/services/doctor-discovery.service.ts`:
   Upsert-Fehler nicht nur in `report.errors` sammeln, sondern optional werfen
   oder einen strict-Modus einfuehren. Das hat mehr API-Oberflaeche und sollte
   reviewed werden.

4. **Heartbeat-Wrapper generisch haerten:**
   `withCronHeartbeat` soll Results mit `{ ok: false }` als Fehler behandeln.
   Das betrifft viele Cron-Routen und braucht einen eigenen Review.

## Verifikation

Keine vollstaendige Verifikation ausgefuehrt, weil kein Code-Fix umgesetzt
wurde. Precheck und Eskalationsdatei erstellt.

## Commit

Kein Commit erstellt. Grund: STOP wegen unerwarteter Ursache.

## Mini-Audit

Nicht ausgefuehrt, weil keine Auth-/RLS-/Admin-Surface-/Token-/Migration-
Aenderung vorgenommen wurde. Nur Precheck und Handoff-Dokumentation.
