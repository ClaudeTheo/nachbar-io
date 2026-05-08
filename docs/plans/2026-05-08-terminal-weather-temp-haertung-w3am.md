# W3am Terminal Wetter-Temperatur-Haertung

Datum: 2026-05-08 nachmittag

## Ziel

`TerminalHeader` und `ScreensaverOverlay` sollen direkte kaputte
`data.weather.temp`-Runtime-Werte nicht als `NaN°C`, `Infinity°C` oder
`[object Object]°C` anzeigen.

## Pre-Check

Code-Suche vor Umsetzung:

```powershell
rg -n "weather\.temp|temperature|tempC|NaN°C|Infinity°C|forecast|TerminalHeader|ScreensaverOverlay|normalize.*Weather|weather.*normalize|as.*Temperature" app components lib modules __tests__
```

Ergebnis:

- `lib/terminal/useTerminalData.ts` normalisiert Wetterdaten bereits beim
  Device-Status.
- `TerminalHeader` und `ScreensaverOverlay` koennen aber direkte kaputte
  Context-Werte rendern.
- Kein neuer Service/Adapter; lokale Anzeigegrenze in den bestehenden
  Komponenten.

## TDD

RED:

```powershell
npx vitest run components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx
```

Fehlschlaege wie erwartet:

- Header zeigte `[object Object]°C`.
- Screensaver zeigte `Infinity°C`.

GREEN:

```powershell
npx vitest run components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx
```

Ergebnis: 4 Tests gruen.

## Aenderung

- `TerminalHeader` rendert Temperaturen nur bei `number` + `Number.isFinite`.
- `ScreensaverOverlay` nutzt dieselbe lokale Temperatur-Grenze fuer zentrierte
  Wetteranzeige und untere Wetterleiste.
- Fallback bleibt `--°C`.

## Gates

Kein Push, kein Deploy, keine Prod-DB, keine Vercel-Env-/Secret-/Billing-/Auth-
Aenderung. Stripe/Billing bleibt bis zur GmbH wartend.
