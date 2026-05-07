# W3o Info-Hub Muellabfuhr-Normalisierung

Datum: 2026-05-07 abend
Repo: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`

## Ziel

`normalizeQuartierInfoResponse` soll falsch geformte `waste_next`-Eintraege
nicht mehr als halbgueltige API-/TTS-Daten weiterreichen. Der Vorlesetext und
die Quartier-Info-UI sollen keine `undefined`-Labels oder unbrauchbaren
Datumswerte aus kaputten Partial-Daten erhalten.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "WasteNext|waste_next|formatWasteDate|Muell|Müll|Abfuhr|normalizeQuartierInfoResponse" modules app lib __tests__
```

Gefundene bestehende Infrastruktur:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\types.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\services\quartier-info.service.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\voice\services\daily-brief.service.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\components\InfoBar.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\app\(app)\quartier-info\page.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\modules\info-hub\normalize-response.test.ts`

Entscheidung: bestehende zentrale Response-Normalisierung erweitern, keine neue
Validator-Infrastruktur bauen.

## TDD

RED:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts -t "filtert falsch geformte Muellabfuhr"
```

Erwartet fehlgeschlagen: `waste_next` reichte vorher alle Array-Objekte durch,
auch ohne `date`, ohne `type`, mit falschem `type` oder mit nicht nutzbarem
Datum.

GREEN:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts -t "filtert falsch geformte Muellabfuhr"
```

Danach gruen: 1 Test passed.

## Umsetzung

- `normalizeWasteNext` in
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`
  filtert Muellabfuhr-Eintraege auf den bestehenden `WasteNext`-Vertrag.
- `date` muss ein gueltiges ISO-Datum im Format `YYYY-MM-DD` sein.
- `type` und `label` muessen Strings sein.
- Gueltige Eintraege werden als enges `WasteNext`-Objekt zurueckgebaut.

## Verifikation

Gruen:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts __tests__/api/quartier-info-route.test.ts __tests__/pages/quartier-info-vorlesen.test.tsx __tests__/lib/voice/daily-brief.service.test.ts
```

Ergebnis: 4 Testdateien, 40 Tests gruen.

Ebenfalls gruen:

```powershell
npx eslint modules/info-hub/normalize-response.ts __tests__/modules/info-hub/normalize-response.test.ts app/api/quartier-info/route.ts __tests__/api/quartier-info-route.test.ts "app/(app)/quartier-info/page.tsx" __tests__/pages/quartier-info-vorlesen.test.tsx modules/voice/services/daily-brief.service.ts __tests__/lib/voice/daily-brief.service.test.ts
git diff --check
npx tsc --noEmit
npm run build
```

`git diff --check` meldete nur die bekannten CRLF-Hinweise. `npm run build`
meldete wie erwartet lokal `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen
deaktiviert`; Stripe/Billing bleibt bis zur angemeldeten GmbH wartend.

## Gates

Nicht gemacht:

- kein Push
- kein Deploy
- keine Prod-DB-Schreibaktion
- keine Prod-Migration
- keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung
- keine Stripe-/Billing-Aktivierung vor angemeldeter GmbH
