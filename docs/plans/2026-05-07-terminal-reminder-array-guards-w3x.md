# W3x Terminal Reminder-Array-Guards

Datum: 2026-05-07 abend

## Ziel

`ErinnerungenScreen` darf nicht crashen, wenn `/api/device/reminders` fuer
`stickies` oder `appointments` keinen Array liefert. Kaputte Werte werden wie
leere Listen behandelt.

## Pre-Check

Ausgefuehrt vor Code-Aenderungen:

```powershell
rg -n "data\?\.|data\.|weather\.|pollen\.|forecast\.|oepnv\.|waste_next|nina\.|rathaus\.|apotheken\.|events\.|Object\.entries\(|\.map\(" -S "app\(app)\quartier-info" modules\info-hub components\terminal lib\terminal __tests__\pages __tests__\components __tests__\modules
rg -n "normalizeQuartierInfoResponse|normalize[A-Z]|is[A-Z].*Data|Array\.isArray|PollenIntensity|WeatherData|QuartierInfoResponse" -S modules\info-hub lib\terminal components\terminal "app\(app)\quartier-info" __tests__\modules __tests__\api components\terminal\__tests__
rg -n "stickies|appointments|medications|contacts|news|alerts|\.map\(|Object\.entries\(" -S components\terminal app\terminal lib\terminal components\terminal\__tests__ __tests__\components
rg -n "ErinnerungenScreen|ScreensaverOverlay|NewsScreen|VideochatScreen|AppointmentPopup|TerminalHeader|reminders|stickies|appointments|contacts" -S components\terminal __tests__ components\terminal\__tests__
```

Ergebnis:

- Info-Hub-API und Info-Hub-UI nutzen bereits
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`.
- Terminal-Forecast-Verbraucher sind bereits durch W3w gehaertet.
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\ErinnerungenScreen.tsx`
  setzte `data.stickies ?? []` und `data.appointments ?? []` direkt in State.
- Entscheidung: Kein neuer Terminal-Normalizer, sondern kleiner Array-Guard
  direkt am bestehenden `/api/device/reminders`-Adapter im Screen.

Hinweis: Ein erster Pre-Check-Versuch mit ungeeignet gequotetem
`app\(app\)`-Pfad scheiterte in PowerShell ohne Datei-Aenderung. Der Check
wurde mit passenden Pfaden wiederholt.

## TDD

RED:

- Neuer Test fuer `ErinnerungenScreen` mit
  `stickies: { id: "sticky-1" }` und `appointments: "kaputte Termine"`.
- Vor der Aenderung crashte der Screen mit:
  `TypeError: appointments.reduce is not a function`.

GREEN:

- `ErinnerungenScreen` prueft `Array.isArray(data.stickies)` und
  `Array.isArray(data.appointments)`.
- Nicht-Array-Werte werden auf `[]` normalisiert.
- Der Screen rendert danach den bestehenden Leerzustand
  `Keine Erinnerungen vorhanden`.

## Geaenderte Dateien

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\ErinnerungenScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-terminal-reminder-array-guards-w3x.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

## Verifikation

Gezielt gruen:

```powershell
npx vitest run components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
```

Breitere Verifikation nach Dokumentation:

```powershell
npx eslint components\terminal\screens\ErinnerungenScreen.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

## Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.

Stripe/Billing bleibt bis zur angemeldeten GmbH wartend; Zahlungen bleiben
lokal deaktiviert.
