# Quartier-Info Cron-Auth-Matrix

Datum: 2026-05-09 vormittag
Owner: Codex

## Ziel

Nach der Aktivierung der Quartier-Info-Crons sollen die neuen Routen auch in der
zentralen Main-Cron-Auth-Matrix sichtbar bleiben. Das ist reine lokale
Testhaertung: keine Prod-DB, keine Vercel-Env, keine Secrets.

## Pre-Check

Code-Suche vor der Aenderung:

- `rg "sync_meta|municipal_config|osm-poi-sync|quartier-events-sync|cron" app components lib modules __tests__ docs/plans`
- Bestehende Infrastruktur gefunden:
  - Route-Tests fuer `app/api/cron/osm-poi-sync/route.ts`
  - Route-Tests fuer `app/api/cron/quartier-events-sync/route.ts`
  - Zentrale Cron-Auth-Matrix in `__tests__/api/cron/main-crons.test.ts`

Entscheidung: kein Neubau, nur Adapter/Erweiterung der bestehenden
Auth-Matrix.

## TDD

RED:

```powershell
npx vitest run __tests__/api/cron/main-crons.test.ts
```

Erwartete Luecke:

```text
missing = ["osm-poi-sync", "quartier-events-sync"]
```

GREEN:

- `main-crons.test.ts` importiert `vercel.json`.
- Neuer Guard prueft, dass die zwei geplanten Quartier-Info-Crons in der
  zentralen Auth-Matrix eingetragen sind.
- Matrix enthaelt jetzt:
  - `osm-poi-sync`
  - `quartier-events-sync`

## Verification

```powershell
npx vitest run __tests__/api/cron/main-crons.test.ts app/api/cron/osm-poi-sync/route.test.ts app/api/cron/quartier-events-sync/route.test.ts __tests__/config/vercel-crons.test.ts
```

Ergebnis: 4 Testdateien, 44 Tests gruen.

Weitere Checks:

```powershell
git diff --check
npx eslint __tests__/api/cron/main-crons.test.ts
npx tsc --noEmit
```

Ergebnis: alle drei Checks gruen.

## Rote Gates

Nicht beruehrt:

- kein Push
- kein Deploy
- keine Prod-DB-Schreibaktion
- keine Vercel-Env-/Secret-Aenderung
- keine Billing-/Provider-Aenderung
