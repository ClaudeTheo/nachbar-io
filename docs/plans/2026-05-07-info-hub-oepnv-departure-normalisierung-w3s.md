# W3s Info-Hub OePNV-Departure-Normalisierung

Datum: 2026-05-07 abend

## Ziel

`normalizeQuartierInfoResponse` soll falsch geformte OePNV-Abfahrten innerhalb
gueltiger Haltestellen zentral herausfiltern. Dadurch rendert
`C:\Users\thoma\Claud Code\Handy APP\nachbar-io\app\(app)\quartier-info\page.tsx`
keine Abfahrtszeilen mit fehlender Linie, fehlendem Ziel, fehlender Uhrzeit,
kaputtem Gleis oder kaputtem Countdown.

## Pre-Check

Codebase-Suche:

```powershell
rg -n "OepnvDeparture|departures|Departure|oepnv" modules lib app __tests__
rg -n "normalizeQuartierInfoResponse|normalize.*Oepnv|is.*Departure|countdown|platform" modules lib app __tests__
```

Ergebnis: passende Infrastruktur existiert bereits in
`C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`.
`departures` wurde dort bisher nur auf Array normalisiert. Es wurde kein neuer
Service gebaut, sondern der bestehende zentrale Normalizer erweitert.

## Umsetzung

Geaendert:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\modules\info-hub\normalize-response.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\api\quartier-info-route.test.ts`

Verhalten:

- `departures` bleibt bei Nicht-Array-Werten ein leeres Array.
- Departure-Eintraege werden nur uebernommen, wenn `line`, `destination`,
  `time` und `platform` Strings sind und `countdown` eine Zahl ist.
- Gueltige Eintraege werden auf diese Felder plus optionales String-`hint`
  normalisiert.
- Die API-Route `/api/quartier-info` profitiert weiterhin ueber den bestehenden
  `normalizeQuartierInfoResponse`-Aufruf.

## TDD

RED:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts
npx vitest run __tests__/api/quartier-info-route.test.ts
```

Erwartet fehlgeschlagen: 2 neue Tests rot, weil kaputte Departure-Objekte noch
durchgereicht wurden.

GREEN:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts
npx vitest run __tests__/api/quartier-info-route.test.ts
```

Ergebnis: Normalizer-Testdatei 12/12 gruen, Route-Testdatei 7/7 gruen.

## Verifikation

Gruen:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts __tests__/api/quartier-info-route.test.ts
npx eslint modules/info-hub/normalize-response.ts __tests__/modules/info-hub/normalize-response.test.ts __tests__/api/quartier-info-route.test.ts
git diff --check
npx tsc --noEmit
npm run build
```

Ergebnis: 2 Testdateien, 19 Tests gruen. ESLint, `git diff --check`,
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
