# Quartier-Info Auto-Sync-Crons aktiviert

Datum: 2026-05-09
Owner: Codex
Scope: `vercel.json`-Cron-Schedule fuer vorhandene, geschuetzte Sync-Routen.

## Ausgangslage

Mig 188 ist auf Production angewendet und verifiziert:
`public.municipal_config.sync_meta` existiert als `jsonb NOT NULL DEFAULT '{}'::jsonb`.

Die vorhandenen Sync-Routen waren lokal implementiert und getestet, aber noch
nicht in `vercel.json` geplant:

- `/api/cron/osm-poi-sync`
- `/api/cron/quartier-events-sync`

Beide Routen pruefen `CRON_SECRET` ueber `verifyCronSecret`.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "vercel\.json|crons|osm-poi-sync|quartier-events-sync|quartier-info-sync|nina-sync" __tests__ app modules docs/plans/handoff/INBOX.md docs/plans docs -g '!node_modules'
```

Befund:

- `vercel.json` enthielt noch keinen Schedule fuer beide Routen.
- Routen- und Service-Tests existierten bereits.
- Plan-Doku sah vor: OSM woechentlich Sonntag 03:00, Events taeglich 06:00.

## TDD

RED:

```powershell
npx vitest run __tests__/config/vercel-crons.test.ts
```

Fehlschlag erwartet: beide Cron-Eintraege fehlten in `vercel.json`.

GREEN:

- `vercel.json`
  - `/api/cron/osm-poi-sync`: `0 3 * * 0`
  - `/api/cron/quartier-events-sync`: `0 6 * * *`
- Routendoku aktualisiert.

## Verifikation

Ausgefuehrt:

```powershell
npx vitest run __tests__/config/vercel-crons.test.ts app/api/cron/osm-poi-sync/route.test.ts app/api/cron/quartier-events-sync/route.test.ts __tests__/modules/info-hub/osm-pharmacy-sync.test.ts __tests__/modules/info-hub/quartier-events-sync.test.ts
npx eslint vercel.json app/api/cron/osm-poi-sync/route.ts app/api/cron/quartier-events-sync/route.ts __tests__/config/vercel-crons.test.ts app/api/cron/osm-poi-sync/route.test.ts app/api/cron/quartier-events-sync/route.test.ts __tests__/modules/info-hub/osm-pharmacy-sync.test.ts __tests__/modules/info-hub/quartier-events-sync.test.ts
npx tsc --noEmit
npm run build
npm run lint
```

Ergebnis:

- Vitest: 5 Dateien, 16 Tests gruen.
- Gezieltes ESLint: TS/Route/Test-Dateien gruen; `vercel.json` wird von ESLint ignoriert.
- TypeScript: gruen.
- Next Build: gruen.
- Voller Lint: gruen.

## Grenzen

- Keine Vercel-Env-/Secret-/Billing-Aenderung.
- Kein Stripe/Billing-Live-Setup.
- Keine Secrets gelesen oder ausgegeben.
