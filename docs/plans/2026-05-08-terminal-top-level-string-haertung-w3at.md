# Terminal Top-Level-String-Haertung W3at

Datum: 2026-05-08 abend

## Ziel

Terminal-Status-Top-Level-Strings aus der Device-Status-API sollen im
zentralen `useTerminalData`-Normalizer getrimmt werden. Whitespace-only Werte
sollen nicht als scheinbar valide UI-Daten im Client-State landen.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "asString\(|userName|greeting|weather\.icon|icon: asString|return \[\{|\.charAt\(|alt=|aria-label|src=|href=|join_url|host_name|provider_type|startsWith\(" lib/terminal components/terminal app/terminal __tests__/lib/terminal components/terminal/__tests__
rg -n "typeof [A-Za-z0-9_.]+ === ['\"]string['\"] \? [A-Za-z0-9_.]+|: [A-Za-z0-9_.]+\s*$|: [A-Za-z0-9_.]+," components/terminal lib/terminal app/terminal
```

Ergebnis:

- Bestehende Infrastruktur gefunden:
  - `lib/terminal/useTerminalData.ts`: `asString`
  - `TerminalHeader` trimmt `userName` bereits fuer die sichtbare Begruessung.
- Kein Neubau. Der vorhandene zentrale `asString`-Normalizer wurde erweitert.

## TDD

RED:

```powershell
npx vitest run __tests__\lib\terminal\useTerminalData.test.tsx
```

Fehlschlag korrekt:

- `weather.icon` blieb `"   "` statt auf `"cloud"` zu fallen.
- Derselbe Test deckt `userName`-Trim und whitespace-only `greeting` ab.

GREEN:

- `asString` trimmt Strings.
- Whitespace-only Strings fallen auf den uebergebenen Fallback zurueck:
  - `weather.icon` -> `"cloud"`
  - `userName`/`greeting` -> `""`

## Verifikation

Gruen:

```powershell
npx vitest run __tests__\lib\terminal\useTerminalData.test.tsx
npx vitest run __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\__tests__\TerminalHeaderContextGuards.test.tsx components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx
npx eslint lib\terminal\useTerminalData.ts __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\__tests__\TerminalHeaderContextGuards.test.tsx components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx
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
