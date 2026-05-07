# W3l Info-Hub Weather/Pollen-Normalisierung

Datum: 2026-05-07

## Ziel

`normalizeQuartierInfoResponse` soll falsch geformte Weather-/Pollen-Werte
nicht als scheinbar gueltige API-/UI-Daten weiterreichen. Kaputte Werte werden
auf `null` gesetzt.

## Pre-Check

Gezielter Repo-Pre-Check in `nachbar-io/`:

```powershell
rg -n "normalizeQuartierInfoResponse|normalizeWeather|normalizePollen|QuartierWeather|PollenData|weather:|pollen:" modules/info-hub __tests__/modules/info-hub __tests__/api __tests__/pages
```

Gefunden:

- Zentraler Normalizer:
  `modules/info-hub/normalize-response.ts`
- Bestehende Normalizer-Tests:
  `__tests__/modules/info-hub/normalize-response.test.ts`
- Nutzer des Normalizers:
  `app/api/quartier-info/route.ts`,
  `app/(app)/quartier-info/page.tsx`,
  `modules/info-hub/components/InfoBar.tsx`

Entscheidung: Bestehende `normalizeWeather`/`normalizePollen`-Funktionen
erweitern; kein neuer Validator und keine neue Service-Schicht.

## Umsetzung

- `normalizeWeather` akzeptiert nur Objekte mit:
  `temp: number | null`, `description: string`, `icon: string`,
  `forecast: Array`.
- `normalizePollen` akzeptiert nur Objekte mit `region: string`, Objekt-Map
  `pollen` und numerischen `today`-/`tomorrow`-Werten pro Eintrag.
- Falsch geformte Werte werden `null`.
- Gueltige Weather-/Pollen-Payloads bleiben unveraendert erhalten.

## TDD

RED:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts -t "Wetter- und Pollendaten"
```

Der neue Test fiel erwartungsgemaess, weil `weather: { description: "kaputt" }`
noch als Objekt durchgereicht wurde.

GREEN:

```powershell
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts -t "Wetter- und Pollendaten"
```

Ergebnis: 2/2 relevante Tests gruen.

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

- Vitest: 3 Dateien, 16/16 Tests gruen.
- ESLint: gruen.
- `git diff --check`: gruen.
- `npx tsc --noEmit`: gruen.
- `npm run build`: gruen.

Bekannte Build-Warnung:

```text
STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert
```

Hinweis: Ein erster ESLint-Aufruf ohne Quotes um
`app/(app)/quartier-info/page.tsx` scheiterte an PowerShell-Pfadklammern; der
korrekt gequotete Aufruf war gruen.

## Gates

- Kein Push.
- Kein Deploy.
- Keine Prod-DB-Schreibaktion.
- Keine Migration.
- Keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.
