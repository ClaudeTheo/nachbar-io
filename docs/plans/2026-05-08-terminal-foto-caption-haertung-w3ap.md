# W3ap Terminal Foto-Caption-Haertung

Datum: 2026-05-08 nachmittag

## Ziel

`FamilienFotosScreen` und `ScreensaverOverlay` behandeln whitespace-only
Foto-Captions wie fehlende Captions. Dadurch entstehen keine leeren
Caption-Balken und keine nutzlosen `alt="   "`-Attribute.

## Pre-Check

Ausgefuehrt vor Code-Aenderungen:

```powershell
rg -n "\| (pending|in-progress|blocked) \|" docs\plans\handoff\INBOX.md
rg -n "FamilienFotosScreen|ScreensaverOverlay|photo|photos|caption|alt|normalize.*photo|TerminalDeviceListGuards|Foto" components __tests__ lib app docs\plans -g "*.ts" -g "*.tsx" -g "*.md"
rg -n "normalizePhotos|normalizeScreensaverPhotos|caption|FamilienFotos|Screensaver" components\terminal\__tests__ __tests__\lib\terminal docs\plans\2026-05-07-terminal-device-list-normalisierung-w3y.md docs\plans\2026-05-07-terminal-separate-device-item-shape-haertung-w3aa.md
```

Ergebnis:

- Es gibt bereits lokale Foto-Normalizer in:
  - `components\terminal\screens\FamilienFotosScreen.tsx`
  - `components\terminal\ScreensaverOverlay.tsx`
- W3y/W3aa decken bereits kaputte Listen-Shapes, Objekt-Captions,
  kaputte URLs und kaputte Datumswerte ab.
- Entscheidung: keine neue Infrastrukturdatei und kein neuer Adapter. Die
  bestehenden lokalen Normalizer werden minimal erweitert.

## TDD

RED:

- Neuer Test fuer Familienfotos zeigte `alt="   "` und einen leeren
  Caption-Balken statt Fallback `Familienfoto`.
- Neuer Test fuer Screensaver zeigte `alt="   "` statt dekorativem `alt=""`.

GREEN:

- `normalizeCaption` trimmt Captions in beiden Komponenten.
- Whitespace-only Captions werden zu `null` normalisiert.
- Valide Captions bleiben sichtbar.

## Geaenderte Dateien

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\FamilienFotosScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\ScreensaverOverlay.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\__tests__\TerminalDeviceListGuards.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-08-terminal-foto-caption-haertung-w3ap.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

## Verifikation

Gruen gelaufen:

```powershell
npx vitest run components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx vitest run components\terminal\__tests__\TerminalDeviceListGuards.test.tsx components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx __tests__\lib\terminal\useTerminalData.test.tsx
npx eslint components\terminal\screens\FamilienFotosScreen.tsx components\terminal\ScreensaverOverlay.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
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
