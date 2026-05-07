# W3aa Terminal Separate-Device-Item-Shape-Haertung

Datum: 2026-05-07 abend

## Ziel

Separate Terminal-Device-Endpunkte sollen nicht nur Listen-Shapes, sondern auch
kaputte Einzel-Eintraege defensiv behandeln. Betroffen:

- `/api/device/photos` in Familienfotos und Screensaver
- `/api/device/contacts` in Videochat
- `/api/device/reminders` in Erinnerungen, Screensaver und Appointment-Popup

## Pre-Check

Ausgefuehrt vor Code-Aenderungen:

```powershell
rg -n "data\?\.|data\.|\.map\(|\.reduce\(|Object\.entries\(|new Date\(|toLocale|newsCount|alerts\.length|stickiesCount|appointmentsToday|photosCount|unreadCount|forecast|publishedAt|createdAt|scheduled_at|title|caption|url" -S components\terminal app\terminal lib\terminal components\terminal\__tests__ __tests__\lib\terminal
rg -n "interface .*Photo|interface .*Contact|interface .*Sticky|interface .*Appointment|setPhotos|setContacts|setStickies|setAppointments|json\.contacts|data\.photos|rData\.stickies|appointments\.reduce|photos\.length|contacts\.map|stickies\.map" -S components\terminal app\terminal lib\terminal components\terminal\__tests__ __tests__
rg -n "api/device/photos|api/device/reminders|api/device/contacts|photos:|contacts:|stickies:|appointments:|upcomingPopup" -S app\api\device __tests__\api components\terminal
rg -n "function getDevicePhotos|function getDeviceContacts|function getDeviceReminders|getDevicePhotos|getDeviceContacts|getDeviceReminders|upcomingPopup|photos:" -S lib\services __tests__\lib __tests__\api
```

Ergebnis:

- Es gibt bereits Screen-nahe Fetch-Adapter mit Array-Guards in:
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\FamilienFotosScreen.tsx`
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\VideochatScreen.tsx`
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\ErinnerungenScreen.tsx`
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\ScreensaverOverlay.tsx`
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\AppointmentPopup.tsx`
- Die API-Services liefern normale Shapes, aber die UI sollte bei
  halbkaputten Payloads nicht crashen.
- Entscheidung: keine neue Produktiv-Infrastrukturdatei. Kleine lokale
  Item-Normalizer direkt an den bestehenden Fetch-Adaptern.

## TDD

RED:

- Familienfotos reichten `null`-/kaputte Foto-Items durch und zeigten
  kaputte Zaehler/Leerbild-Zustaende.
- Videochat crashte bei `null` in `contacts`.
- Erinnerungen crashte bei `null` in `appointments`.
- Screensaver crashte bei `null` in `stickies`.
- Appointment-Popup konnte ein Popup mit kaputtem `scheduled_at` rendern.

GREEN:

- Familienfotos filtert Fotos ohne nicht-leere `id`, nicht-leere `url`,
  gueltige `caption`-Form oder gueltiges `createdAt`.
- Videochat filtert Kontakte ohne `id`, `caregiver_id`,
  `caregiver_name` oder gueltiges Avatar-Shape; optionale Statusfelder fallen
  auf sichere Defaults.
- Erinnerungen filtert Stickies ohne `id`, `title`, `created_at` und Termine
  ohne `id`, `title`, gueltiges `scheduled_at` oder gueltiges `expires_at`.
- Screensaver filtert Foto- und Sticky-Items vor dem Rendern.
- Appointment-Popup ignoriert kaputte `upcomingPopup`-Objekte.

## Geaenderte Dateien

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\FamilienFotosScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\VideochatScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\ErinnerungenScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\ScreensaverOverlay.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\AppointmentPopup.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\__tests__\TerminalDeviceListGuards.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-terminal-separate-device-item-shape-haertung-w3aa.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

## Verifikation

Gruen gelaufen:

```powershell
npx vitest run components\terminal\__tests__\TerminalDeviceListGuards.test.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
npx vitest run components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx eslint components\terminal\screens\FamilienFotosScreen.tsx components\terminal\screens\VideochatScreen.tsx components\terminal\screens\ErinnerungenScreen.tsx components\terminal\ScreensaverOverlay.tsx components\terminal\AppointmentPopup.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Build-Hinweis: `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`
ist erwartetes lokales Verhalten. Stripe/Billing bleibt bis zur angemeldeten
GmbH wartend.

## Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.
