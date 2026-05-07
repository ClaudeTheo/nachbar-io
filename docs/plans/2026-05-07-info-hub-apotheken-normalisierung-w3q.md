# W3q Info-Hub Apotheken-Normalisierung

Datum: 2026-05-07 abend

## Ziel

`normalizeQuartierInfoResponse` soll falsch geformte Apotheken-Eintraege
zentral herausfiltern. Dadurch rendert
`C:\Users\thoma\Claud Code\Handy APP\nachbar-io\app\(app)\quartier-info\page.tsx`
keine Apothekenkarten mit fehlendem Namen, kaputter Telefonnummer oder
unbrauchbaren Oeffnungszeiten.

## Pre-Check

Codebase-Suche:

```powershell
rg -n "Apotheke|apotheken|openingHours|notdienst" modules lib app __tests__
```

Ergebnis: passende Infrastruktur existiert bereits in
`C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`.
Es wurde kein neuer Normalizer gebaut, sondern der bestehende zentrale Adapter
erweitert.

## Umsetzung

Geaendert:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\modules\info-hub\normalize-response.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\api\quartier-info-route.test.ts`

Verhalten:

- `apotheken` bleibt bei Nicht-Array-Werten ein leeres Array.
- Array-Eintraege werden nur uebernommen, wenn `name`, `address`, `phone`
  und `openingHours` Strings sind.
- Gueltige Eintraege werden auf genau diese vier Felder normalisiert.
- Die API-Route `/api/quartier-info` profitiert weiterhin ueber den bestehenden
  `normalizeQuartierInfoResponse`-Aufruf.

## TDD

RED:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts __tests__/api/quartier-info-route.test.ts
```

Erwartet fehlgeschlagen: 2 neue Tests rot, weil kaputte Apotheken-Objekte noch
durchgereicht wurden.

GREEN:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts __tests__/api/quartier-info-route.test.ts
```

Ergebnis: 2 Testdateien, 15 Tests gruen.

## Verifikation

Gruen:

```powershell
npx eslint modules/info-hub/normalize-response.ts __tests__/modules/info-hub/normalize-response.test.ts __tests__/api/quartier-info-route.test.ts
git diff --check
npx tsc --noEmit
npm run build
```

Hinweis: `npm run build` meldet weiterhin
`STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`. Das ist aktuell
erwartet; Stripe/Billing bleibt bis zur angemeldeten GmbH wartend.

## Gates

Nicht gemacht:

- kein Push
- kein Deploy
- keine Prod-DB-Schreibaktion
- keine Migration
- keine Vercel-Env-/Secret-/Auth-Aenderung
- keine Stripe-/Billing-Aktivierung
