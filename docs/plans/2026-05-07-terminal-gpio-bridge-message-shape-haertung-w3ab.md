# W3ab Terminal GPIO-Bridge-Message-Shape-Haertung

Datum: 2026-05-07 abend

## Ziel

Die lokale GPIO-WebSocket-Bridge des Senioren-Terminals darf kaputte
Statusmessages nicht in den React-State uebernehmen. Besonders wichtig:
`gpioAvailable` bleibt ein Boolean und wird nicht durch Werte wie `"yes"` oder
andere falsch geformte Payloads ersetzt.

## Pre-Check

Ausgefuehrt vor Code-Aenderungen:

```powershell
rg -n "useGpioBridge|gpio|WebSocket|event\.data|JSON\.parse" lib\terminal components\terminal __tests__ -g "*.ts" -g "*.tsx"
rg -n "TerminalContext|IncomingCallOverlay|KioskIncomingCall|KioskContactCard|VideochatScreen|useGpioBridge" components\terminal\__tests__ components\terminal\video\__tests__ __tests__ -g "*.ts" -g "*.tsx"
```

Ergebnis:

- Bestehende Infrastruktur liegt in
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\terminal\useGpioBridge.ts`.
- Es gab noch keine gezielte Hook-Testdatei fuer die GPIO-Bridge.
- Kein neuer Service, keine neue Runtime-Abstraktion, keine API-Route noetig.
  Der vorhandene WebSocket-Message-Handler wurde minimal gehaertet.

## TDD

RED:

- Neuer Test in
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\lib\terminal\useGpioBridge.test.tsx`.
- Failing Output: `expected 'yes' to be true`.
- Ursache: `{ gpio: "yes" }` ueberschrieb `gpioAvailable` trotz falschem Shape.

GREEN:

- `useGpioBridge` prueft geparste WebSocket-Messages mit `isRecord`.
- `gpioAvailable` wird nur gesetzt, wenn `gpio` wirklich ein Boolean ist.
- Nicht-Objekte, kaputtes JSON und falsch typisierte `gpio`-Werte bleiben
  wirkungslos.

## Geaenderte Dateien

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\terminal\useGpioBridge.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\lib\terminal\useGpioBridge.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-terminal-gpio-bridge-message-shape-haertung-w3ab.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

## Verifikation

RED zuerst gesehen:

```powershell
npx vitest run __tests__\lib\terminal\useGpioBridge.test.tsx
```

Gruen gelaufen:

```powershell
npx vitest run __tests__\lib\terminal\useGpioBridge.test.tsx
npx vitest run __tests__\lib\terminal\useGpioBridge.test.tsx __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx
npx eslint lib\terminal\useGpioBridge.ts __tests__\lib\terminal\useGpioBridge.test.tsx
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
