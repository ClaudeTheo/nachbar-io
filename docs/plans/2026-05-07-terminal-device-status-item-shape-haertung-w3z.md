# W3z Terminal Device-Status-Item-Shape-Haertung

Datum: 2026-05-07 abend

## Ziel

`/api/device/status` darf keine kaputten Einzel-Eintraege fuer
`weather.forecast`, `alerts` oder `news` bis in die Terminal-UI durchreichen.
Kaputte Titel, Daten, Icons oder Zahlen werden am bestehenden Fetch-Adapter
gefiltert bzw. auf sichere Fallbacks gesetzt.

## Pre-Check

Ausgefuehrt vor Code-Aenderungen:

```powershell
rg -n "normalize|TerminalStatusData|weather\.forecast|alerts|news|forecast|Array\.isArray|title|icon|date|temperature|count|Date" -S lib\terminal components\terminal app\terminal components\terminal\__tests__ __tests__\lib\terminal
rg --files lib\terminal components\terminal app\terminal components\terminal\__tests__ __tests__\lib\terminal
rg -n "alerts\.map|news\.map|forecast\.map|data\.alerts|data\.news|weather\.forecast|newsCount|unreadCount|photosCount|remindersCount|stickiesCount|appointmentsToday|lastCheckin|nextAppointment|publishedAt|createdAt|tempMax|relevance" -S components\terminal app\terminal lib\terminal __tests__\lib\terminal components\terminal\__tests__
rg -n "normalizeQuartierInfoResponse|isValid|asFiniteNumber|asString|asArray|filter\(|map\(|Number\.isFinite|Date\.parse|Invalid Date|publishedAt|createdAt|tempMax|icon" -S modules\info-hub lib components app __tests__
```

Ergebnis:

- Bestehende Terminal-Infrastruktur:
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\terminal\useTerminalData.ts`
  mit `normalizeTerminalStatusData`.
- Bestehendes Vergleichsmuster im Info-Hub:
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`
  nutzt `flatMap`-Filter fuer kaputte Items.
- Entscheidung: Kein neuer Service, keine neue Produktivdatei. Der bestehende
  Terminal-Status-Adapter wurde erweitert.

## TDD

RED:

- Neuer Test in
  `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\lib\terminal\useTerminalData.test.tsx`
  zeigte, dass kaputte Forecast-Items weitergereicht wurden.
- Erweiterter RED zeigte, dass `null` in einem Forecast-Array den kompletten
  Fetch-Adapter in den Fehlerpfad brachte.

GREEN:

- `normalizeWeatherForecast` filtert Items ohne nicht-leeren `day`, finite
  `tempMax` oder nicht-leeres `icon`.
- `normalizeAlerts` filtert Items ohne `id`, `category`, `title`, `body`,
  boolean `isEmergency` oder gueltiges `createdAt`.
- `normalizeNews` filtert Items ohne `id`, `title`, `summary`-Shape,
  `category`, `categoryLabel`, finite `relevance` oder gueltiges
  `publishedAt`.
- `weather.icon` faellt bei falschem Shape auf `"cloud"` zurueck.
- Ungueltige Top-Level-Dates werden `null`; negative oder falsch typisierte
  Count-Werte werden `0`.

## Geaenderte Dateien

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\terminal\useTerminalData.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\lib\terminal\useTerminalData.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-terminal-device-status-item-shape-haertung-w3z.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

## Verifikation

Gezielt gruen:

```powershell
npx vitest run __tests__\lib\terminal\useTerminalData.test.tsx
npx vitest run components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
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
