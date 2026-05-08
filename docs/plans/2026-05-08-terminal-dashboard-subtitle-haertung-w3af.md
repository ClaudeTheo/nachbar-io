# Terminal Dashboard-Subtitle-Haertung W3af

Datum: 2026-05-08 mittag

## Ziel

Terminal-Dashboard-Subtitles defensiv gegen kaputte Runtime-Werte haerten,
damit die Senior-Kacheln keine `Invalid Date`-, `NaN`- oder `Infinity`-Texte
anzeigen.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "lastCheckin|last check|subtitle|Subtitle|dashboard|TerminalDashboard|NaN|Invalid Date|format.*Date|formatDistance|Checkin|checkin|stats|online|battery|alert|count|normalize.*(subtitle|dashboard|terminal|display)|display.*(subtitle|name|date)|safe.*(date|count|string)" app\terminal components\terminal lib\terminal __tests__ -S
rg --files app\terminal components\terminal lib\terminal __tests__ | rg "(terminal|Terminal|dashboard|Dashboard|page|test)"
Get-Content -Raw app\terminal\[token]\page.tsx
Get-Content -Raw lib\terminal\useTerminalData.ts
```

Ergebnis:

- Bestehende Device-API-Normalisierung gefunden:
  - `lib/terminal/useTerminalData.ts`
- Dashboard-Subtitles werden aber lokal in
  `app/terminal/[token]/page.tsx` berechnet.
- Kein neuer Service/keine neue Lib noetig. Umsetzung als lokaler Adapter in
  der bestehenden Terminal-Seite.

## TDD

RED:

```powershell
npx vitest run __tests__\app\terminal\page.test.tsx
```

Erwarteter roter Fehler:

- Dashboard renderte bei `lastCheckin: "kein Datum"` den Text
  `Letztes: Invalid Date Uhr`.

GREEN:

- `asDashboardDate` akzeptiert nur parsebare String-Daten.
- `asDashboardCount` akzeptiert nur positive finite Zahlen.
- Dashboard-Subtitles nutzen normalisierte Werte fuer Check-in, Brett,
  Neuigkeiten, Erinnerungen und Fotos.
- Kaputte Werte fallen auf vorhandene ruhige Fallbacks zurueck:
  `Heute noch nicht geteilt`, `Keine neuen`, `Noch keine Fotos`.

## Verifikation

Gruen:

```powershell
npx vitest run __tests__\app\terminal\page.test.tsx
npx vitest run __tests__\app\terminal\page.test.tsx __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx
npx eslint app\terminal\[token]\page.tsx __tests__\app\terminal\page.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Build-Hinweis:

- `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert` ist erwartetes
  lokales Verhalten.

## Rote Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.

Stripe/Billing bleibt bis zur GmbH wartend.
