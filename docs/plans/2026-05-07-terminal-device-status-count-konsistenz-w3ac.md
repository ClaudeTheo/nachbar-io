# W3ac Terminal Device-Status-Count-Konsistenz

Datum: 2026-05-07 abend

## Ziel

Die Terminal-Dashboard-Zaehler sollen nicht mehr von den normalisierten Listen
abweichen. Wenn kaputte `alerts`- oder `news`-Items herausgefiltert werden,
duerfen `unreadCount` und `newsCount` keine Phantom-Zaehler anzeigen.

## Pre-Check

Ausgefuehrt vor Code-Aenderungen:

```powershell
rg -n "newsCount|alertsCount|photosCount|remindersCount|stickiesCount|appointmentsToday|unreadCount|normalizeTerminalStatusData|getDeviceStatus|DeviceStatus" lib app modules __tests__ -g "*.ts" -g "*.tsx"
rg -n "news_count|newsCount|photos_count|reminders_count|stickies_count|appointments_today|getDeviceStatus|device/status" lib app modules __tests__ -g "*.ts" -g "*.tsx"
```

Ergebnis:

- Server-seitig setzt
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\services\device.service.ts`
  bereits `unreadCount: alerts.length` und `newsCount: news.length`.
- Client-seitig normalisiert
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\terminal\useTerminalData.ts`
  die Listen, uebernahm aber `newsCount`/`unreadCount` noch separat aus dem
  Payload.
- Entscheidung: keine neue Infrastruktur. Der bestehende Client-Normalizer
  berechnet die listenbasierten Counts aus den bereits normalisierten Listen.

## TDD

RED:

- Test in
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\lib\terminal\useTerminalData.test.tsx`
  von `newsCount: 3` auf erwartetes `0` bei kaputtem `news`-Shape umgestellt.
- Failing Output: `expected 3 to be +0`.

GREEN:

- `normalizeTerminalStatusData` normalisiert `alerts` und `news` zuerst in
  lokale Konstanten.
- `unreadCount` wird aus `alerts.length` berechnet.
- `newsCount` wird aus `news.length` berechnet.
- Zweiter Test wurde angepasst: bei einem gueltigen News-/Alert-Eintrag sind
  die Counts trotz kaputter Top-Level-Count-Werte `1`.

## Geaenderte Dateien

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\terminal\useTerminalData.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\lib\terminal\useTerminalData.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-terminal-device-status-count-konsistenz-w3ac.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

## Verifikation

RED zuerst gesehen:

```powershell
npx vitest run __tests__\lib\terminal\useTerminalData.test.tsx
```

Gruen gelaufen:

```powershell
npx vitest run __tests__\lib\terminal\useTerminalData.test.tsx
npx vitest run __tests__\lib\terminal\useTerminalData.test.tsx __tests__\lib\terminal\useGpioBridge.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx
npx eslint lib\terminal\useTerminalData.ts __tests__\lib\terminal\useTerminalData.test.tsx
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
