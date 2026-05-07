# W2 Quartier-Events-Projektion lokal

Datum: 2026-05-07

## Ziel

Die Quartier-Info-Seite soll vorhandene Quartierkalender-Eintraege aus der bestehenden `events`-Tabelle in `municipal_config.events` nutzen koennen. Das ist ein lokaler Zwischenschritt der Events-Welle, ohne neue externe Quelle.

## Pre-Check

Gefunden und genutzt, keine zweite Event-Infrastruktur gebaut:

- `events`-Tabelle mit `quarter_id`, `event_date`, `event_time`, `category`.
- `municipal_config.events` als JSONB-Ziel fuer die Quartier-Info-Seite.
- `modules/info-hub/services/events.ts` mit alten statischen Bad-Saeckingen-Events.
- `lib/services/amtsblatt-sync.service.ts` und `municipal_announcements` fuer Amtsblatt-Meldungen.
- `lib/services/news-rss.service.ts` fuer Nachrichten-RSS, nicht fuer Quartier-Info-Events.
- `modules/waste/services/ics-connector.ts` als vorhandener ICS-Parser, hier bewusst nicht dupliziert.

## Umsetzung

- Neuer Service `runQuartierEventsSync` projiziert kommende `events` pro aktivem Quartier nach `municipal_config.events`.
- Vorhandene manuell gepflegte `municipal_config.events` bleiben erhalten.
- Alte automatisch projizierte Events (`source: "events-table"` oder `eventId`) werden ersetzt.
- Dubletten gegen manuelle Event-Titel werden nicht nochmal geschrieben.
- `sync_meta.events` dokumentiert `ok`/`error`, Quelle, Zeitpunkt, gefundene Events, geschriebene Events und manuell erhaltene Events.
- Neue Cron-Route `/api/cron/quartier-events-sync` ist mit `CRON_SECRET` geschuetzt.

Nicht gemacht:

- Kein RSS/iCal-Web-Crawler.
- Kein neuer externer Anbieter.
- Kein `vercel.json`-Schedule.
- Kein Closed-Pilot-Public-Path fuer Production-Schedule.
- Kein Push, kein Deploy, kein Prod-DB-Schreiben, keine Vercel-Env-/Secret-Aenderung.

## Verifikation

```powershell
npx vitest run __tests__/modules/info-hub/quartier-events-sync.test.ts app/api/cron/quartier-events-sync/route.test.ts
npx eslint modules/info-hub/services/quartier-events-sync.service.ts __tests__/modules/info-hub/quartier-events-sync.test.ts app/api/cron/quartier-events-sync/route.ts app/api/cron/quartier-events-sync/route.test.ts
npx tsc --noEmit
git diff --check
npm run build
```

Ergebnis: gruen. `vercel.json` enthaelt keinen Schedule fuer `/api/cron/quartier-events-sync`. `npm run build` ist gruen; lokale Warnung: `STRIPE_SECRET_KEY nicht konfiguriert`.
