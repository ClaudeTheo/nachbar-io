# Cron-Health-Welle — Option B mit Trigger

Datum: 2026-05-26
Status: GEPLANT (nicht gestartet)

## Trigger fuer Start

Eines davon:

- 2026-06-01 nach erstem `doctors_refresh`-Lauf, falls `metadata` erneut
  `errors > 0` oder `ok = false` zeigt
- vor erstem Pilot-Haushalt-Onboarding, falls das vor dem 2026-06-01 passiert

## Belegte Symptome heute

- `osm_poi_sync` 2026-05-24 03:00:36 UTC:
  `metadata.errors = 1`, `updated = 0`, `pharmacies = 0`, `quarters = 1`.
  Der Cron-Handler lief ohne Exception durch und schrieb trotzdem einen
  Heartbeat.
- `lib/care/with-cron-heartbeat.ts` schreibt nach erfolgreichem Handler-Return
  immer einen Heartbeat, unabhaengig vom Result-Objekt.
- `doctors_refresh` hat noch keinen Heartbeat. Das ist nach Code- und
  Schedule-Stand plausibel: Route erst am 2026-05-11 eingefuehrt, Cron laeuft
  monatlich `0 3 1 * *`, erster regulaerer Lauf also 2026-06-01 03:00 UTC.

## Code-Wahrheit / Korrekturen zur Claude-Sicht

- `lib/care/cron-heartbeat.ts` ist nur ein Re-Export.
- Die eigentliche Heartbeat-Logik liegt in
  `modules/care/services/cron-heartbeat.ts`.
- Die Admin-Anzeige laeuft ueber:
  - `modules/admin/services/health.service.ts`
  - `app/(app)/admin/components/SystemHealth.tsx`
- Eine Datei `app/admin/cron-health/page.tsx` existiert aktuell nicht.
- `cron_heartbeats` hat aktuell keine `status`- oder `last_failure_at`-Spalte.
  Schemaquelle: `supabase/migrations/049_cron_heartbeats.sql` und
  `supabase/migrations/20260316125000_baseline_full_snapshot.sql`.

## Geplanter Fix (TDD, RED zuerst)

### Tests

- `lib/care/with-cron-heartbeat.test.ts`:
  - Handler-Result `{ ok: false }`
  - Handler-Result `{ errors: ["..."] }`
  - Handler-Result `{ ok: false, errors: ["..."] }`
- `modules/care/services/cron-heartbeat.test.ts`:
  - `writeCronHeartbeat` persistiert Status/Metadata korrekt.
  - `checkCronHealth` wertet non-green Heartbeats korrekt als `warn` oder
    `error`.

### Service-Code

- `lib/care/with-cron-heartbeat.ts`:
  - Result-Objekte pruefen.
  - `result.ok === false` oder `result.errors.length > 0` erkennen.
  - Daraus `status: "ok" | "partial" | "failure"` ableiten.
- `modules/care/services/cron-heartbeat.ts`:
  - `writeCronHeartbeat` nimmt den abgeleiteten Status an und schreibt ihn.
  - `checkCronHealth` kombiniert Zeitstatus und Ergebnisstatus.

### Migration (gelbe Zone, Founder-Go noetig)

Variante A:

```sql
ALTER TABLE cron_heartbeats
  ADD COLUMN status TEXT NOT NULL DEFAULT 'ok'
  CHECK (status IN ('ok', 'partial', 'failure'));
```

Variante B:

```sql
ALTER TABLE cron_heartbeats
  ADD COLUMN last_failure_at TIMESTAMPTZ NULL;
```

Praeferenz fuer die Welle: Variante A, weil das Admin-Dashboard direkt zwischen
`ok`, `partial` und `failure` unterscheiden kann.

### Admin-Dashboard

- `modules/admin/services/health.service.ts`:
  - non-green Heartbeat-Status in HealthChecks uebernehmen.
- `app/(app)/admin/components/SystemHealth.tsx`:
  - `partial`/`failure` farbig anzeigen oder auf bestehende `warn`/`error`
    abbilden.

## Out of Scope

- Keine Aenderung an den einzelnen Cron-Routen.
- Keine Aenderung an `cron_heartbeats`-RLS.
- Kein direkter Fix an `doctors_refresh`, solange der generische
  Heartbeat-Status die Ursache sauber sichtbar macht.

## Pre-Check-Belege vor Codeaenderung

Vor Start der Welle erneut ausfuehren:

```bash
rg -n "cron_heartbeats|status|last_failure_at" supabase/migrations
rg -n "writeCronHeartbeat|checkCronHealth" lib/care modules/care/services
rg -n "Cron:|checkCronHealth|SystemHealth" modules/admin app/(app)/admin
```

## Read-only Befund municipal_config

Der vom Founder vorgeschlagene Query auf `municipal_config.center_lat` /
`center_lng` ist schema-inkorrekt; die Center-Koordinaten liegen in
`quarters`. Schema-korrekter Read vom 2026-05-26:

```sql
SELECT mc.quarter_id, q.center_lat, q.center_lng,
       jsonb_array_length(mc.apotheken::jsonb) AS apotheken_count
FROM municipal_config mc
LEFT JOIN quarters q ON q.id = mc.quarter_id
WHERE mc.quarter_id = 'ee6cfcab-f615-47cd-afe7-808a27cb584b';
```

Ergebnis:

```text
quarter_id = ee6cfcab-f615-47cd-afe7-808a27cb584b
center_lat = 47.5535
center_lng = 7.964
apotheken_count = 3
```

Bewertung: Kein Pilot-Showstopper fuer Apothekenanzeige. Der fehlgeschlagene
`osm_poi_sync`-Lauf vom 2026-05-24 ist eher ein Refresh-/Overpass-Glitch ueber
bereits vorhandenen Daten als ein leerer Datenbestand.
