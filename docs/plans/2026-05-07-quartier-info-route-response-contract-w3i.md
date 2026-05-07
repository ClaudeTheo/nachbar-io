# W3i Quartier-Info API-Route Response-Vertrag

Datum: 2026-05-07

## Ziel

`GET /api/quartier-info` soll den Quartier-Info-Response-Vertrag auch auf
Route-Ebene absichern. Listenfelder werden als Arrays ausgeliefert, selbst wenn
ein interner Service oder driftende Daten versehentlich Nicht-Array-Werte
zurueckgeben.

## Pre-Check

Gezielter Repo-Pre-Check in `nachbar-io/`:

```powershell
rg -n "quartier-info|QuartierInfo|getQuartierInfo|normalizeQuartierInfo|normalize.*response|buildDailyBrief|waste_next|notdienst_url|events_calendar_url" app lib modules __tests__
```

Gefunden:

- Bestehender Normalizer:
  `modules/info-hub/normalize-response.ts`
- Bestehender Route-Test:
  `__tests__/api/quartier-info-route.test.ts`
- Bestehende API-Route:
  `app/api/quartier-info/route.ts`

Entscheidung: Kein neuer Normalizer, kein neuer Service. Die Route nutzt den
bestehenden `normalizeQuartierInfoResponse`.

## Umsetzung

- `app/api/quartier-info/route.ts` normalisiert das Ergebnis von
  `getQuartierInfo` vor `NextResponse.json`.
- `__tests__/api/quartier-info-route.test.ts` prueft jetzt, dass kaputte
  Nicht-Array-Werte fuer `nina`, `waste_next`, `rathaus`, `apotheken`,
  `events` sowie `oepnv.departures` als Arrays ausgeliefert werden.
- Falsch typisierte URL-Felder `notdienst_url` und `events_calendar_url`
  werden auf leere Strings normalisiert.

## TDD

RED:

```powershell
npx vitest run __tests__/api/quartier-info-route.test.ts
```

Der neue Test fiel erwartungsgemaess fehl, weil die Route die Service-Antwort
noch unveraendert auslieferte.

GREEN:

```powershell
npx vitest run __tests__/api/quartier-info-route.test.ts
```

Ergebnis: 3/3 Tests gruen.

## Verifikation

Gruen:

```powershell
npx vitest run __tests__/api/quartier-info-route.test.ts __tests__/modules/info-hub/normalize-response.test.ts
npx eslint app/api/quartier-info/route.ts __tests__/api/quartier-info-route.test.ts modules/info-hub/normalize-response.ts
git diff --check
npx tsc --noEmit
npm run build
```

Ergebnisse:

- Vitest: 2 Dateien, 6/6 Tests gruen.
- ESLint: gruen.
- `git diff --check`: gruen.
- `npx tsc --noEmit`: gruen.
- `npm run build`: gruen.

Bekannte Build-Warnung:

```text
STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert
```

## Gates

- Kein Push.
- Kein Deploy.
- Keine Prod-DB-Schreibaktion.
- Keine Migration.
- Keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.
