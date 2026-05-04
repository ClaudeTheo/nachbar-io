# Quartier-Info W0 Prod Read-only Check

Datum: 2026-05-04
Founder-Go: `Go W0 read-only Prod-Check`
Scope: Nur Production read-only SQL/API-Smoke. Keine Prod-DB-Schreibaktion, keine Migration, keine Vercel-Env-Aenderung, keine Secrets gelesen oder ausgegeben.

## Frage

Warum wirkt `https://nachbar-io.vercel.app/quartier-info` fuer Bad Saeckingen leer, obwohl Migration 130 statische Quartier-Info-Daten seedet?

## Read-only SQL-Checks

Ausgefuehrt via:

```powershell
npx supabase db query --linked --output json "<select-only SQL>"
```

### Schema/Migration

Production enthaelt die relevanten `municipal_config`-Spalten:

- `apotheken`
- `events`
- `oepnv_stops`
- `notdienst_url`
- `events_calendar_url`
- plus bestehende Rathaus-/Service-Felder

`supabase_migrations.schema_migrations` enthaelt:

- `096_municipal_config` / `20260319181607`
- `100_municipal_seed_bad_saeckingen` / `20260319181759`
- `quartier_info_hub` / `20260327221318`
- `130_municipal_config_dynamic_data` / `20260404134728`

### Bad-Saeckingen-Quartiere in Production

Production hat zwei aktive Bad-Saeckingen-Quartiere:

| quarter_id | name | slug | status | postal_code |
|---|---|---|---|---|
| `0c19636e-32a2-45c2-8099-8b10c5df2746` | Bad Saeckingen Altstadt | `bad-saeckingen-altstadt` | active | 79713 |
| `ee6cfcab-f615-47cd-afe7-808a27cb584b` | Bad Saeckingen - Purkersdorfer/Sanary/Rebberg | `bad-saeckingen-pilot` | active | 79713 |

Beide haben eine `municipal_config`-Zeile mit gefuellten Daten:

| quarter_id | apotheken | events | service_links | wiki_entries | oepnv_stops | notdienst_url | events_calendar_url |
|---|---:|---:|---:|---:|---:|---|---|
| `0c19636e-32a2-45c2-8099-8b10c5df2746` | 3 | 2 | 9 | 8 | 1 | ja | ja |
| `ee6cfcab-f615-47cd-afe7-808a27cb584b` | 3 | 2 | 9 | 13 | 1 | ja | ja |

Sample-Daten:

- Apotheken: Schwarzwald-Apotheke, Bergsee-Apotheke, Loewen-Apotheke
- Events: Wochenmarkt, Wochenmarkt
- Notdienst-URL: Aponet-Suche fuer 79713 Bad Saeckingen
- Event-Kalender: `https://www.badsaeckingen.de/kultur-events/veranstaltungskalender`

### Weitere Stadt-Konfigurationen

Production hat ebenfalls befuellte `municipal_config`-Zeilen fuer:

- Laufenburg (Baden): 1 Apotheke, 6 Service-Links, Notdienst-URL, Event-Kalender
- Rheinfelden (Baden): 2 Apotheken, Notdienst-URL, Event-Kalender
- Koeln: 1 Apotheke, Notdienst-URL, Event-Kalender

`quartier_info_cache` hatte zum Check-Zeitpunkt keine Rows. Das betrifft Wetter/Pollen/OEPNV/NINA-Cache, nicht die statischen `municipal_config`-Daten.

## Live-API-Smoke

Unauthentifizierter GET auf:

```text
https://nachbar-io.vercel.app/api/quartier-info?quarter_id=<bad-saeckingen-quarter-id>
```

Ergebnis fuer beide Bad-Saeckingen-Quarter-IDs:

```json
{
  "statusCode": 503,
  "body": {
    "error": "Der Nachbar.io-Pilot ist geschlossen und nimmt aktuell keine Anmeldungen oder personenbezogenen Daten an.",
    "status": "closed_pilot"
  }
}
```

Das ist kein Quartier-Info-Datenfehler, sondern der Closed-Pilot-Guard fuer unauthentifizierte API-Routen.

## Codepfad-Einordnung

`app/api/quartier-info/route.ts` ruft `getQuartierInfo()` auf und liest per Service-Key die Daten fuer die uebergebene `quarter_id`.

`app/(app)/quartier-info/page.tsx`:

- holt `currentQuarter` ueber `useQuarter()`,
- ruft dann `/api/quartier-info?quarter_id=${quarterId}`,
- setzt die JSON-Antwort auch dann in `data`, wenn `res.ok === false`.

`lib/quarters/quarter-context.tsx`:

- normale Nutzer bekommen `currentQuarter` nur ueber verifizierte `household_members`,
- Super-Admins bekommen alle Quartiere und ggf. `selected_quarter_id`.

`lib/closed-pilot.ts` / `lib/supabase/middleware.ts`:

- `/api/quartier-info` ist nicht in `CLOSED_PILOT_PUBLIC_API_PATHS`,
- unauthentifizierte API-Requests bekommen im Closed-Pilot-Modus 503,
- authentifizierte, aber nicht freigegebene Nutzer bekommen 403 `pilot_approval_pending`.

## Befund

Die Production-Daten fuer Bad Saeckingen sind nicht leer. Beide relevanten Quartiere haben Apotheken, Events, Service-Links, Notdienst-URL und Event-Kalender-URL.

Die Empty-State-Beobachtung auf `/quartier-info` ist daher sehr wahrscheinlich kein fehlender Seed und kein Mig-130-Problem. Wahrscheinlicher sind:

1. Nutzer hat keinen `currentQuarter`, weil keine verifizierte Haushaltsmitgliedschaft vorhanden ist.
2. Super-Admin sieht ein anderes gespeichertes `selected_quarter_id`.
3. Der Client bekommt 503/403 vom Closed-Pilot-Guard und behandelt den Fehler wie leere Quartier-Daten.
4. `quartier_info_cache` ist leer, wodurch Wetter/Pollen/OEPNV/NINA fehlen koennen, aber nicht Apotheken/Events/Rathaus.

## Empfehlung

Vor W1 OSM-POI-Sync sollte ein kleiner UI/API-Fix oder Smoke folgen:

1. In `quartier-info/page.tsx` `res.ok` pruefen und API-Fehler sichtbar als Fehlerzustand behandeln, nicht als Empty State.
2. Fuer Founder-/Super-Admin-Smoke explizit das Pilot-Quarter `ee6cfcab-f615-47cd-afe7-808a27cb584b` auswaehlen oder `selected_quarter_id` loeschen.
3. Optional read-only/authenticated Smoke mit einem freigegebenen Test-/Founder-Konto: pruefen, ob API dann 200 liefert und Counts `apotheken=3`, `events=2`, `service_links=9` sind.
4. W1 bleibt sinnvoll fuer Skalierung, aber nicht als Sofort-Fix fuer Bad Saeckingen-Empty-State. Der Sofort-Fix ist Fehlerbehandlung/Quarter-Kontext.

## Grenzen eingehalten

- Keine Prod-DB-Schreibaktion.
- Keine Migration.
- Keine Vercel-Env-Aenderung.
- Keine Secrets gelesen oder ausgegeben.
- Kein Push.
