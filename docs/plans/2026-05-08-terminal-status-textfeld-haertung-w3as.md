# Terminal Status-Textfeld-Haertung W3as

Datum: 2026-05-08 abend

## Ziel

Weitere Terminal-Status-Textfelder aus der Device-Status-API sollen nicht mit
fuehrenden oder nachgestellten Leerzeichen im Client-State landen.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "title: [A-Za-z0-9_.]+$|title: [A-Za-z0-9_.]+,|summary: [A-Za-z0-9_.]+,|categoryLabel: [A-Za-z0-9_.]+,|body: [A-Za-z0-9_.]+,|category: [A-Za-z0-9_.]+," lib/terminal components/terminal app/terminal __tests__/lib/terminal components/terminal/__tests__
rg -n "\.trim\(\)|isNonEmptyString|asString|normalize[A-Za-z]+\(" lib/terminal components/terminal app/terminal __tests__/lib/terminal components/terminal/__tests__
```

Ergebnis:

- Bestehende Infrastruktur gefunden:
  - `lib/terminal/useTerminalData.ts`: `normalizeWeatherForecast`,
    `normalizeAlerts`, `normalizeNews`, `isNonEmptyString`
  - Angrenzende UI-Normalizer in `TerminalHeader`, `ScreensaverOverlay` und
    `NewsScreen`
- Kein Neubau. Nur bestehende `useTerminalData`-Normalizer enger angewendet.

## TDD

RED:

```powershell
npx vitest run __tests__\lib\terminal\useTerminalData.test.tsx
```

Fehlschlag korrekt:

- Forecast `day`/`icon` blieben mit Rand-Leerzeichen.
- Alert `category`/`body` blieben mit Rand-Leerzeichen.
- News `summary`/`category`/`categoryLabel` blieben mit Rand-Leerzeichen.
- Whitespace-only News-Summary blieb als leer wirkender Text statt `null`.

GREEN:

- `normalizeWeatherForecast` trimmt `day` und `icon`.
- `normalizeAlerts` trimmt `category` und `body`.
- `normalizeNews` trimmt `summary`, `category` und `categoryLabel`.
- Whitespace-only `summary` wird zu `null`.

## Verifikation

Gruen:

```powershell
npx vitest run __tests__\lib\terminal\useTerminalData.test.tsx
npx vitest run __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx eslint lib\terminal\useTerminalData.ts __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Build-Hinweis:

- `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert` ist erwartetes
  lokales Verhalten.

## Rote Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung. Stripe/Billing bleibt bis
zur GmbH wartend.
