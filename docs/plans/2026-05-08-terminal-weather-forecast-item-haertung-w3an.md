# W3an Terminal Wetter-Forecast-Item-Haertung

Datum: 2026-05-08 nachmittag

## Ziel

`TerminalHeader` und `ScreensaverOverlay` sollen direkte kaputte
`data.weather.forecast`-Eintraege nicht als React-Child-Objekte, `Infinity°`
oder sonstige kaputte Forecast-Texte rendern.

## Pre-Check

Code-Suche vor Umsetzung:

```powershell
rg -n "weather\.temp|temperature|tempC|NaN°C|Infinity°C|forecast|TerminalHeader|ScreensaverOverlay|normalize.*Weather|weather.*normalize|as.*Temperature" app components lib modules __tests__
rg -n "new Date\(|\.map\(|\.reduce\(|data\?\.|\{[^\n]*(title|name|description|message|temp|count|scheduled|created|url)|src=|href=|toLocale(Date|Time)String|Number\(|Math\.round" components\terminal app\terminal lib\terminal __tests__\app\terminal components\terminal\__tests__
```

Ergebnis:

- Forecast-Array-Guards existierten bereits.
- Einzelne Forecast-Items wurden in `TerminalHeader` und `ScreensaverOverlay`
  noch direkt gerendert.
- Kein neuer Service/Adapter; lokale Anzeigegrenze in den bestehenden
  Komponenten.

## TDD

RED:

```powershell
npx vitest run components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx
```

Fehlschlag wie erwartet:

- React-Child-Fehler fuer Objekt-`day`.

GREEN:

```powershell
npx vitest run components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx
```

Ergebnis: 6 Tests gruen.

## Aenderung

- `TerminalHeader` filtert Forecast-Items auf nicht-leeren String-`day` und
  finite Number-`tempMax`.
- `ScreensaverOverlay` nutzt dieselbe lokale Grenze fuer zentrale
  Wetteranzeige und untere Leiste.
- Kaputte Forecast-Items werden ausgelassen; valide Items bleiben sichtbar.

## Gates

Kein Push, kein Deploy, keine Prod-DB, keine Vercel-Env-/Secret-/Billing-/Auth-
Aenderung. Stripe/Billing bleibt bis zur GmbH wartend.
