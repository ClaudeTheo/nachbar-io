# W3aq Terminal Reminder-Titel-Haertung

Datum: 2026-05-08 nachmittag

## Ziel

Reminder-/Termin-Titel werden in den Terminal-Oberflaechen nicht mehr mit
Rand-Leerzeichen gerendert. Betroffen:

- `ErinnerungenScreen` fuer Sticky-Notizen und Termine
- `AppointmentPopup` fuer anstehende Termin-Popups
- `ScreensaverOverlay` fuer Sticky-Notizen

## Pre-Check

Ausgefuehrt vor Code-Aenderungen:

```powershell
rg -n "\| (pending|in-progress|blocked) \|" docs\plans\handoff\INBOX.md
rg -n "ErinnerungenScreen|normalize.*Reminder|normalize.*Appointment|sticky|stickies|appointment|scheduled_at|expires_at|title|description|content|reminder" components\terminal __tests__\lib\terminal app\api\device docs\plans -g "*.ts" -g "*.tsx" -g "*.md"
Get-Content -LiteralPath components\terminal\screens\ErinnerungenScreen.tsx
Get-Content -LiteralPath components\terminal\AppointmentPopup.tsx
Get-Content -LiteralPath components\terminal\ScreensaverOverlay.tsx
Get-Content -LiteralPath components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
Get-Content -LiteralPath components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
```

Ergebnis:

- Es gibt bereits lokale Normalizer in den betroffenen Komponenten.
- W3x/W3aa decken kaputte Listen-Shapes, kaputte Einzel-Items und kaputte
  Datumswerte bereits ab.
- Offener Rand: `isNonEmptyString` pruefte zwar mit `trim()`, speicherte aber
  den ungetrimmten Original-String.
- Entscheidung: keine neue Infrastrukturdatei. Bestehende lokale Normalizer
  speichern Titel getrimmt.

## TDD

RED:

- Erste Testversion war zu weich, weil Testing Library Whitespace normalisiert.
- Nach Schaerfung auf echtes `textContent` fielen die neuen Tests korrekt:
  - Sticky-Titel in `ErinnerungenScreen`
  - Termin-Titel in `ErinnerungenScreen`
  - Upcoming-Popup-Titel in `AppointmentPopup`
  - Screensaver-Sticky-Titel in `ScreensaverOverlay`

GREEN:

- Lokale `normalizeText`-Helper trimmen validierte Titel.
- Whitespace-only Titel bleiben durch bestehende `isNonEmptyString`-Guards
  weiterhin gefiltert.
- Valide Titel bleiben sichtbar.

## Geaenderte Dateien

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\ErinnerungenScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\AppointmentPopup.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\ScreensaverOverlay.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\__tests__\TerminalDeviceListGuards.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-08-terminal-reminder-title-haertung-w3aq.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

## Verifikation

Gruen gelaufen:

```powershell
npx vitest run components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
npx vitest run components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx vitest run components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx __tests__\lib\terminal\useTerminalData.test.tsx
npx eslint components\terminal\screens\ErinnerungenScreen.tsx components\terminal\AppointmentPopup.tsx components\terminal\ScreensaverOverlay.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

`git diff --check` meldete nur CRLF-Hinweise, keine Whitespace-Fehler.
Build-Hinweis `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`
ist erwartetes lokales Verhalten.

## Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.

Stripe/Billing bleibt bis zur angemeldeten GmbH wartend.
