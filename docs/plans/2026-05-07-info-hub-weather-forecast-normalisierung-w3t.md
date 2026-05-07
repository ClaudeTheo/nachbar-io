# W3t Info-Hub Weather-Forecast-Normalisierung

Datum: 2026-05-07 abend

## Ziel

`normalizeQuartierInfoResponse` soll falsch geformte
`weather.forecast`-Eintraege zentral herausfiltern. Dadurch rendert
`C:\Users\thoma\Claud Code\Handy APP\nachbar-io\app\(app)\quartier-info\page.tsx`
ueber `WeatherWidget` keine Forecast-Zeilen mit fehlendem Tag, kaputter
Hoechsttemperatur oder kaputtem Icon.

## Pre-Check

Codebase-Suche:

```powershell
rg -n "QuartierWeatherDay|forecast|tempMax|weather\.forecast|normalizeWeather|QuartierWeather" modules lib app __tests__
rg -n "buildDailyBrief|weather|forecast|tempMax" modules/voice modules/info-hub app __tests__/lib __tests__/modules __tests__/api __tests__/pages
```

Ergebnis: passende Infrastruktur existiert bereits in
`C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`.
`forecast` wurde dort bisher nur auf Array geprueft. Es wurde kein neuer
Service gebaut, sondern der bestehende zentrale Normalizer erweitert.

## Umsetzung

Geaendert:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\modules\info-hub\normalize-response.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\api\quartier-info-route.test.ts`

Verhalten:

- `weather` bleibt `null`, wenn `forecast` kein Array ist oder Basisfelder
  falsch geformt sind.
- Forecast-Eintraege werden nur uebernommen, wenn `day` und `icon` Strings sind
  und `tempMax` eine Zahl ist.
- Gueltige Weather-Objekte werden auf `temp`, `description`, `icon` und den
  normalisierten `forecast` reduziert.
- Die API-Route `/api/quartier-info` profitiert weiterhin ueber den bestehenden
  `normalizeQuartierInfoResponse`-Aufruf.

## TDD

RED:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts
npx vitest run __tests__/api/quartier-info-route.test.ts
```

Erwartet fehlgeschlagen: 2 neue Tests rot, weil kaputte Forecast-Eintraege noch
durchgereicht wurden.

GREEN:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts
npx vitest run __tests__/api/quartier-info-route.test.ts
```

Ergebnis: Normalizer-Testdatei 13/13 gruen, Route-Testdatei 8/8 gruen.

## Verifikation

Gruen:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts __tests__/api/quartier-info-route.test.ts
npx eslint modules/info-hub/normalize-response.ts __tests__/modules/info-hub/normalize-response.test.ts __tests__/api/quartier-info-route.test.ts
git diff --check
npx tsc --noEmit
npm run build
```

Ergebnis: 2 Testdateien, 21 Tests gruen. ESLint, `git diff --check`,
`npx tsc --noEmit` und `npm run build` gruen.

Hinweis: `npm run build` kann weiterhin
`STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert` melden. Das ist
aktuell erwartet; Stripe/Billing bleibt bis zur angemeldeten GmbH wartend.

## Gates

Nicht gemacht:

- kein Push
- kein Deploy
- keine Prod-DB-Schreibaktion
- keine Migration
- keine Vercel-Env-/Secret-/Auth-Aenderung
- keine Stripe-/Billing-Aktivierung
