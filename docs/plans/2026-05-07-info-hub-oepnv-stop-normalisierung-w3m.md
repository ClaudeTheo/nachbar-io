# W3m Info-Hub OePNV-Stop-Normalisierung

Datum: 2026-05-07 abend

## Ziel

`normalizeQuartierInfoResponse` soll falsch geformte OePNV-Haltestellen nicht
als halbgueltige UI-/API-Daten weiterreichen. Haltestellen ohne gueltige
`id` und `name` werden verworfen.

## Pre-Check

Gezielter Repo-Pre-Check in:

```text
C:\Users\thoma\Claud Code\Handy APP\nachbar-io
```

Ausgefuehrt:

```powershell
rg -n "normalizeOepnvStops|OepnvStop|OepnvDeparture|departures|oepnv" modules/info-hub __tests__/modules/info-hub __tests__/api __tests__/pages app lib
```

Gefunden:

- Zentraler Normalizer:
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`
- Bestehende Normalizer-Tests:
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\modules\info-hub\normalize-response.test.ts`
- Route-Vertragstest:
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\api\quartier-info-route.test.ts`
- UI-Nutzung:
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\app\(app)\quartier-info\page.tsx`
  und
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\components\InfoBar.tsx`

Entscheidung: Kein neuer Validator. Bestehende `normalizeOepnvStops`-Funktion
zentral erweitern.

## Umsetzung

- `normalizeOepnvStops` filtert Stop-Objekte ohne `id: string` oder
  `name: string`.
- Gueltige Stops bleiben erhalten.
- `departures` wird weiterhin pro gueltigem Stop auf Array normalisiert.
- Der Route-Test wurde an den strengeren Vertrag angepasst: Ein OePNV-Stop
  ohne `id` wird jetzt als kaputter Stop verworfen.

## TDD

RED:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts -t "filtert falsch geformte OePNV"
```

Der neue Test fiel erwartungsgemaess, weil Stops ohne `id` oder `name` noch
durchgereicht wurden.

GREEN:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts -t "filtert falsch geformte OePNV"
```

Ergebnis: 1/1 Test gruen.

## Verifikation

Gruen:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts __tests__/api/quartier-info-route.test.ts __tests__/pages/quartier-info-vorlesen.test.tsx
npx eslint modules/info-hub/normalize-response.ts __tests__/modules/info-hub/normalize-response.test.ts app/api/quartier-info/route.ts __tests__/api/quartier-info-route.test.ts "app/(app)/quartier-info/page.tsx" __tests__/pages/quartier-info-vorlesen.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Ergebnisse:

- Vitest: 3 Dateien, 17/17 Tests gruen.
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
