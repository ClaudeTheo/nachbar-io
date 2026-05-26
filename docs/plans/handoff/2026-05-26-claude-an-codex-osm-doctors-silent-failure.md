# ZURUECKGEZOGEN — falscher Service

**Status 2026-05-26:** Dieser Handoff ist zurueckgezogen. Der Precheck hat
ergeben, dass `osm_poi_sync` nur OSM-Apotheken nach
`municipal_config.apotheken` schreibt und nicht fuer `external_doctors`
zustaendig ist. Der echte Doctor-Sync ist `doctors_refresh`
(`/api/cron/doctors-refresh`, Service
`modules/doctors/services/doctor-discovery.service.ts`) und laeuft laut
`vercel.json` monatlich am 1. um 03:00 UTC. Supabase-Read vom 2026-05-26:
`cron_heartbeats` enthaelt keinen `doctors_refresh`-Heartbeat, aber einen
`osm_poi_sync`-Heartbeat vom 2026-05-24 03:00:36+00 mit `metadata.errors = 1`.
Siehe Quittung:
`docs/plans/handoff/2026-05-26-codex-an-claude-quittung-osm-doctors-fix.md`.

# Claude → Codex Handoff: OSM-Doctors Silent Failure

**Datum:** 2026-05-26
**Driver:** Claude (Smoke-Test-Befund aus Pass nach Legal-v2-Welle)
**Worker:** Codex
**Founder-Go:** nicht noetig (kein RLS, keine Migration, kein Admin-Surface, keine Auth-Aenderung)
**Klassifizierung:** Pre-Check + TDD-Fix, geschaetzt 30-45 Min

## Befund

Smoke-Test 2026-05-26 11:00 CEST gegen Prod-DB (`uylszchlyhbpbmslcnka`):

```sql
SELECT count(*), min(fetched_at), max(fetched_at), min(last_seen_at), max(last_seen_at)
FROM external_doctors;
-- → 51 Rows, ALLE mit identischem timestamp 2026-05-11 14:51:21.79888+00
-- → keine Aktualisierung seit 15 Tagen
```

**Cron-Heartbeat** sagt aber, `osm_poi_sync` lief mehrfach:

```sql
SELECT job_id, last_run_at FROM cron_heartbeats WHERE job_id='osm_poi_sync';
-- → 2026-05-24 03:00:36 UTC  (Sa)
```

Sa 17.05. und Sa 24.05. haetten beide den Sync ausloesen muessen. Heartbeat sagt Erfolg, DB-Tabelle wurde aber nicht geschrieben.

## Hypothese

Klassisches **Silent-Failure-Pattern**, gleiche Klasse wie der `assertCacheWriteSucceeded`-Bug aus Pass am 2026-05-11 (Commits `a22c515`, `fb5fae5` — siehe `memory/topics/quartier-info-hub.md`):

- `osm-poi-sync.service.ts` ruft Supabase-Upsert auf
- Supabase wirft bei RLS-/Constraint-Fehlern nicht — gibt `{ data, error }` zurueck
- Cron prueft `error` nicht
- Heartbeat schreibt "success" + Cron-Run beendet
- 0 Rows tatsaechlich geschrieben

Wahrscheinliche Konkret-Ursachen (priorisiert):

1. **RLS-Policy**: `external_doctors` hat moeglicherweise INSERT-Policy, die service_role-Cron nicht passt
2. **Constraint-Fehler**: Mig 194 fuer `external_doctors` koennte UNIQUE/CHECK haben, das auf neue Daten nicht passt
3. **Quartier-Match-Fehler**: Cron sucht Quartiere mit `status='active'`, schreibt aber mit `quarter_id`, die nicht passt (siehe Welle 7 Schema-Drift `lat/lon` → `center_lat/center_lng`)
4. **OSM-API-Timeout**: Cron findet leere Liste → upsertet 0 Rows → kein Fehler, aber `last_seen_at` wird auf existierende Rows auch nicht gehoben

## Pre-Check (Pflicht vor Fix)

```bash
# 1) Service-Datei lesen
cat modules/info-hub/services/osm-poi-sync.service.ts

# 2) Pruefen ob assertCacheWriteSucceeded oder vergleichbarer Helper genutzt wird
grep -rn "assertCacheWriteSucceeded\|external_doctors" modules/info-hub/ lib/ app/api/

# 3) Mig 194 lesen (external_doctors-Tabelle)
cat supabase/migrations/194_external_doctors.sql

# 4) RLS-Policies auf external_doctors pruefen
grep -A 8 "CREATE POLICY.*external_doctors" supabase/migrations/

# 5) Cron-Endpoint pruefen, der osm_poi_sync triggert
grep -rn "osm_poi_sync\|osm-poi-sync" app/api/cron/ vercel.json
```

Wenn `assertCacheWriteSucceeded` (oder Aequivalent) NICHT genutzt wird: das ist die Ursache. Fix-Pattern identisch zu Pass am 2026-05-11.

## TDD-Fix-Pattern (wie Pass 2026-05-11)

1. **RED-Test** schreiben: Mock-Supabase-Client gibt `{ data: null, error: <PostgresError> }` zurueck → erwarten dass `runOsmPoiSync` einen Error wirft oder den Error-Counter erhoeht, NICHT silent success
2. **GREEN**: in `osm-poi-sync.service.ts` nach jedem Upsert `assertCacheWriteSucceeded("osm_doctors", error)` (oder neuen Helper bauen, falls existing Helper nur fuer `quartier_info_cache` ist)
3. **Verifikation**: tsx-Re-Run gegen Prod (read-only) ODER lokal mit Mock — sollte jetzt entweder echte Daten schreiben (Erfolg) ODER expliziten Fehler werfen
4. **Smoke nach Deploy**: 1 Tag warten bis naechster Sa 03:00 UTC, dann erneut `SELECT count(*), max(fetched_at) FROM external_doctors`

## Akzeptanzkriterien

- [ ] TSC + Lint + Vitest clean
- [ ] Mindestens 1 neuer Test, der das Silent-Failure-Pattern abfaengt
- [ ] Wenn Bug bestaetigt: `assertCacheWriteSucceeded` oder Aequivalent in osm-poi-sync.service.ts
- [ ] Wenn Bug NICHT in Service (sondern RLS/Constraint): kurze Notiz in Quittungsdatei, was die Ursache war, dann Codex eskaliert an Claude/Founder
- [ ] Commit-Message: `fix(info-hub): surface osm doctor sync write failures` (gleiche Klasse wie a22c515)
- [ ] **Nicht** pushen — Founder-Go fuer Push (Rote Zone, auch wenn klein)

## Rote-Zone-Verbote

- Kein Force-Push, kein History-Rewrite
- Keine Migration ohne Founder-Go (auch nicht, wenn der Fix eine RLS-Aenderung braucht — dann eskalieren)
- Kein Vercel-Env-Touch
- Kein Secret-Anzeigen

## Quittung erwartet

`docs/plans/handoff/2026-05-26-codex-an-claude-quittung-osm-doctors-fix.md` mit:

- Befundete Ursache (welche der 4 Hypothesen war es?)
- Commit-Hash
- Diff-Stats
- Tail von TSC/Lint/Vitest
- Vorschlag fuer Smoke nach Deploy

## Querverweise

- Vorbild-Pass `a22c515 fix(info-hub): surface cache write failures` (2026-05-11)
- Memory: `topics/quartier-info-hub.md` Sektion "Welle Cache-Persistenz"
- Smoke-Test-Quellen: Cron `cron_heartbeats`, Tabelle `external_doctors`, `cron_job_runs`
- Pre-Check-Regel: `.claude/rules/pre-check.md`

## Anschluss-Befund 2026-05-26

- Echter Doctor-Sync-Pfad bestaetigt: `doctors_refresh` (Commit `11d761d`).
- `doctors_refresh` hat naturgemaess noch keinen Heartbeat:
  Cron-Route erstmals 2026-05-11 committed, naechster regulaerer Lauf laut
  `vercel.json` am 2026-06-01 03:00 UTC.
- `osm_poi_sync` zeigt ein separates Silent-Failure-Symptom:
  `metadata.errors = 1`, `pharmacies = 0`, `quarters = 1` am
  2026-05-24 03:00:36 UTC, obwohl der Heartbeat geschrieben wurde.
- Pilot-Quartier Bad Saeckingen hat bereits Apotheken in `municipal_config`:
  schema-korrekter Read (Join mit `quarters`) ergab `apotheken_count = 3`.
  Damit kein Pilot-Showstopper fuer Apothekenanzeige; eher ein fehlgeschlagener
  Refresh/Overpass-Glitch ueber vorhandenem Datenbestand.
- Folge-Welle dokumentiert in
  `docs/plans/2026-05-26-cron-health-welle.md`.
