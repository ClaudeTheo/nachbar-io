# W1: OSM-Apotheken-Sync fuer Quartier-Info

Datum: 2026-05-04
Scope: Lokale Implementierung, kein Prod-Apply, kein Deploy, kein Push, keine Vercel-Env-Aenderung, keine Secrets.

## Ziel

Quartier-Info soll Apotheken nicht nur manuell aus `municipal_config.apotheken` lesen, sondern lokal einen Cron-tauglichen Sync-Baustein bekommen, der OSM/Overpass als skalierbare Quelle nutzen kann.

## Pre-Check

Pflicht-Pre-Check vor Neubau:

- `lib/map-geo.ts` enthaelt bereits `OVERPASS_URL`, aber nur fuer Gebaeude-Queries (`way["building"]`), nicht fuer POIs.
- `modules/info-hub/services/quartier-info-sync.service.ts` ist das Muster fuer Info-Hub-Cron-Services.
- `app/api/cron/quartier-info-sync/route.ts` und `app/api/cron/nina-sync/route.ts` sind das Muster fuer `CRON_SECRET` + `getAdminSupabase`.
- `municipal_config.apotheken` existiert und wird von `lib/services/quartier-info.service.ts` gelesen.
- Kein bestehender OSM-POI-/Apotheken-Sync gefunden.

## Umsetzung

Neue Dateien:

- `modules/info-hub/services/osm-poi-sync.service.ts`
- `app/api/cron/osm-poi-sync/route.ts`
- `__tests__/modules/info-hub/osm-pharmacy-sync.test.ts`
- `app/api/cron/osm-poi-sync/route.test.ts`

Der Service:

- baut eine kleine Overpass-Query fuer `amenity=pharmacy` und `healthcare=pharmacy`,
- fragt Nodes/Ways/Relations in der Quartiers-BBox ab,
- parst Name, Adresse, Telefon, Oeffnungszeiten und Koordinaten,
- markiert Auto-Daten mit `source: "osm-overpass"`, `osmId`, `lat`, `lng`, `syncedAt`,
- entfernt alte automatisch gesyncte OSM-Eintraege,
- behaelt manuelle Apotheken unveraendert,
- fuegt OSM-Eintraege nur hinzu, wenn kein manueller Eintrag mit gleichem Namen existiert.

Die Cron-Route:

- liegt unter `/api/cron/osm-poi-sync`,
- ist mit `CRON_SECRET` geschuetzt,
- nutzt `getAdminSupabase()`,
- ist **nicht** in `vercel.json` eingeplant. Eine echte Schedule-Aktivierung bleibt separates Founder-Go.

## Bewusst nicht umgesetzt

- Keine `vercel.json`-Cron-Schedule-Aenderung.
- Keine Migration 188.
- Keine Sync-Metadaten-Spalte.
- Kein Notdienst-Apotheken-Import.
- Kein Events-/RSS-/iCal-Crawler.
- Kein Prod-DB-Schreibtest.

## Verifikation

Ausgefuehrt:

```powershell
npx vitest run __tests__/modules/info-hub/osm-pharmacy-sync.test.ts app/api/cron/osm-poi-sync/route.test.ts __tests__/pages/quartier-info-vorlesen.test.tsx
npx eslint "modules/info-hub/services/osm-poi-sync.service.ts" "__tests__/modules/info-hub/osm-pharmacy-sync.test.ts" "app/api/cron/osm-poi-sync/route.ts" "app/api/cron/osm-poi-sync/route.test.ts"
npx tsc --noEmit
```

Ergebnis:

- Vitest: 3 Files, 14 Tests passed
- ESLint: gruen
- TypeScript: gruen

## Naechste Schritte

1. Vor echter Aktivierung: entscheiden, ob W5/Mig 188 als `sync_meta` vorgezogen wird.
2. Falls Schedule gewuenscht: separates Founder-Go fuer `vercel.json`-Cron-Eintrag.
3. Optional lokaler/Preview-Smoke mit Overpass-Live-Fetch gegen ein kleines Pilot-Bounding-Box-Fenster, aber nicht im Unit-Test.
