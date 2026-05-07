# W3w Terminal Weather-Forecast-Guards

Datum: 2026-05-07 abend

## Ziel

Terminal-Header und Screensaver duerfen nicht crashen, wenn die Device-API fuer
`data.weather.forecast` keinen Array liefert. Kaputte Werte werden wie ein
leerer Forecast behandelt.

## Pre-Check

Ausgefuehrt vor Code-Aenderungen:

```powershell
rg -n "Object\.entries\(|\.map\(|forecast|pollen|weather|data\.weather|data\.pollen|data\?\.weather|data\?\.pollen" -S modules\info-hub components\terminal lib\terminal __tests__\pages __tests__\components
rg -n "TerminalHeader|ScreensaverOverlay|useTerminalData|TerminalContext|forecast" -S __tests__ components\terminal lib\terminal app\terminal
```

Ergebnis:

- Info-Hub-API und Info-Hub-UI nutzen bereits
  `normalizeQuartierInfoResponse`.
- Terminal-Daten kommen separat ueber
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\terminal\useTerminalData.ts`.
- Betroffene Verbraucher:
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\TerminalHeader.tsx`
  und
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\ScreensaverOverlay.tsx`.
- Entscheidung: Kein neuer Terminal-Normalizer, sondern kleiner Array-Guard
  direkt an den zwei Forecast-Verbrauchsstellen.

Hinweis: Ein erster Pre-Check-Versuch mit ungeeignet gequotetem
`app\(app\)`-Pfad scheiterte in PowerShell ohne Datei-Aenderung. Der Check
wurde mit passenden Pfaden wiederholt.

## TDD

RED:

- Neuer Test fuer `TerminalHeader` mit `forecast: "kaputter Forecast"` zeigte
  `TypeError: forecast.map is not a function`.
- Neuer Test fuer `ScreensaverOverlay` mit `forecast: { day: "Mo" }` zeigte
  `TypeError: data?.weather?.forecast?.map is not a function`.

GREEN:

- Beide Komponenten pruefen `Array.isArray(data?.weather?.forecast)`.
- Nicht-Array-Werte werden auf `[]` normalisiert.
- Gueltige Arrays bleiben unveraendert renderbar.

## Geaenderte Dateien

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\TerminalHeader.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\ScreensaverOverlay.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-terminal-weather-forecast-guards-w3w.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

## Verifikation

Gezielt gruen:

```powershell
npx vitest run components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx
```

Breitere Verifikation:

```powershell
npx eslint components\terminal\TerminalHeader.tsx components\terminal\ScreensaverOverlay.tsx components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

## Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.

Stripe/Billing bleibt bis zur angemeldeten GmbH wartend; Zahlungen bleiben
lokal deaktiviert.
