# W3y Terminal Device-Listen-Normalisierung

Datum: 2026-05-07 abend

## Ziel

Terminal-Device-Verbraucher sollen kaputte Listen-Shapes aus Device-APIs wie
leere Listen behandeln. Diese Welle fasst mehrere verwandte Stellen zusammen:

- `/api/device/status` in `useTerminalData`
- `/api/device/photos` in Familienfotos
- `/api/device/contacts` in Videochat
- `/api/device/photos` und `/api/device/reminders` im Screensaver

## Pre-Check

Ausgefuehrt vor Code-Aenderungen:

```powershell
rg -n "set[A-Z][A-Za-z]+\([^)]*\?\? \[\]|const [a-zA-Z]+ = data\?\.[a-zA-Z_]+ \?\? \[\]|\.map\(|\.reduce\(|Object\.entries\(" -S components\terminal app\terminal lib\terminal components\terminal\__tests__
rg -n "FamilienFotosScreen|NewsScreen|ScreensaverOverlay|photos|contacts|news = data\?\.news|json\.contacts|pData\.photos|rData\.stickies" -S components\terminal __tests__ components\terminal\__tests__ app\api\device
rg -n "renderHook|useTerminalData|TerminalStatusData|waitFor\(" -S __tests__ components lib modules
```

Ergebnis:

- Info-Hub hat zentrale Normalisierung, Terminal-Device-Status noch nicht.
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\terminal\useTerminalData.ts`
  reichte Device-Status-JSON bisher direkt als `TerminalStatusData` weiter.
- Separate Terminal-Endpunkte wurden direkt in Screen-State gesetzt:
  `FamilienFotosScreen`, `VideochatScreen`, `ScreensaverOverlay`.
- Es gibt bestehende Hook-Test-Infrastruktur mit `renderHook`.
- Entscheidung: Zentrale Normalisierung im bestehenden `useTerminalData`
  plus kleine Array-Guards an den separaten Fetch-Adaptern. Kein neuer Service,
  keine neue Datei fuer Produktivcode.

## TDD

RED:

- `useTerminalData` reichte `weather.forecast`, `alerts` und `news` auch dann
  weiter, wenn die API Nicht-Arrays lieferte.
- `FamilienFotosScreen` zeigte bei Objekt-`photos` den Foto-Modus mit
  unbrauchbarem Zaehler statt den Leerzustand.
- `VideochatScreen` crashte mit `TypeError: contacts.map is not a function`.
- `ScreensaverOverlay` rendert ein array-like Nicht-Array-`photos`-Objekt als
  Foto und Caption.

GREEN:

- `useTerminalData` normalisiert `weather.forecast`, `alerts` und `news` auf
  Arrays und setzt kaputte Zahlen/Textfelder auf sichere Fallbacks.
- `FamilienFotosScreen`, `VideochatScreen` und `ScreensaverOverlay` nutzen
  `Array.isArray` an ihren Device-Endpoint-Adaptern.
- Kaputte Listenwerte werden wie `[]` behandelt.

## Geaenderte Dateien

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\terminal\useTerminalData.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\FamilienFotosScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\VideochatScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\ScreensaverOverlay.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\lib\terminal\useTerminalData.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\__tests__\TerminalDeviceListGuards.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-terminal-device-list-normalisierung-w3y.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

## Verifikation

Gezielt gruen:

```powershell
npx vitest run __tests__\lib\terminal\useTerminalData.test.tsx
npx vitest run components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
```

Breitere Verifikation nach Dokumentation:

```powershell
npx vitest run components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx eslint lib\terminal\useTerminalData.ts components\terminal\screens\FamilienFotosScreen.tsx components\terminal\screens\VideochatScreen.tsx components\terminal\ScreensaverOverlay.tsx __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

## Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.

Stripe/Billing bleibt bis zur angemeldeten GmbH wartend; Zahlungen bleiben
lokal deaktiviert.
