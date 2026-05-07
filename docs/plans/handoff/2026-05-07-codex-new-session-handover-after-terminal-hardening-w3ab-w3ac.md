# Codex New-Session-Handover nach Terminal-Haertung W3ab-W3ac

Datum: 2026-05-07 abend

## Fuer die naechste Session zuerst ausfuehren/lesen

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status -sb
git log --oneline origin/master..HEAD
Get-Content -Raw AGENTS.md
Get-Content -Raw docs\plans\handoff\INBOX.md
Get-Content -Raw docs\plans\2026-05-07-terminal-gpio-bridge-message-shape-haertung-w3ab.md
Get-Content -Raw docs\plans\2026-05-07-terminal-device-status-count-konsistenz-w3ac.md
```

## Rote Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung ohne explizites Founder-GO
von Thomas.

Stripe/Billing bleibt bis zur angemeldeten GmbH wartend. Zahlungen lokal
deaktiviert lassen.

Bekannte untracked Altdateien nicht anfassen.

## Aktueller lokaler Stand

- Branch: `master`
- Vor diesem Handover-Commit: `master...origin/master [ahead 90]`.
- Nach diesem Handover-Commit voraussichtlich: `ahead 91`.
- Kein Push/Deploy/Prod-DB/Vercel-Env/Secrets/Billing gemacht.
- Arbeitsbaum vor diesem Handover hatte nur bekannte untracked Altdateien:
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\.codex-welle-d-3001.pid`
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-04-quartier-info-skalierung-auto-first.md`
  - alte `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-03-*` / `2026-05-04-*` Founder-/Claude-Handdateien

## Letzte relevante Commits

- `cbc8ab1 fix(terminal): align status counts with normalized lists`
- `833e987 docs(handoff): claim terminal count consistency`
- `9bc2ef1 fix(terminal): validate gpio bridge status messages`
- `ac8f5a4 docs(handoff): claim terminal gpio bridge hardening`
- `e13c077 fix(terminal): validate separate device item shapes`
- `fe3556a docs(handoff): claim terminal separate device item guards`
- `105da9e fix(terminal): validate device status item shapes`
- `e4601fa docs(handoff): claim terminal item shape hardening`

## Erledigt in W3ab

Dateien:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\terminal\useGpioBridge.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\lib\terminal\useGpioBridge.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-terminal-gpio-bridge-message-shape-haertung-w3ab.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

Verhalten:

- Lokale GPIO-WebSocket-Statusmessages setzen `gpioAvailable` nur noch, wenn
  `gpio` wirklich ein Boolean ist.
- Kaputte JSON-/Nicht-Objekt-/falsch typisierte Messages bleiben wirkungslos.
- RED war `expected 'yes' to be true`.

## Erledigt in W3ac

Dateien:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\terminal\useTerminalData.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\lib\terminal\useTerminalData.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-terminal-device-status-count-konsistenz-w3ac.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

Verhalten:

- `normalizeTerminalStatusData` berechnet `unreadCount` aus den normalisierten
  `alerts`.
- `normalizeTerminalStatusData` berechnet `newsCount` aus den normalisierten
  `news`.
- Damit zeigen Terminal-Dashboard-Kacheln keine Phantom-Zaehler mehr, wenn
  kaputte Status-Items herausgefiltert wurden.
- RED war `expected 3 to be +0`.

## Verifikation zuletzt gruen

```powershell
npx vitest run __tests__\lib\terminal\useTerminalData.test.tsx __tests__\lib\terminal\useGpioBridge.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx
npx eslint lib\terminal\useTerminalData.ts __tests__\lib\terminal\useTerminalData.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Build-Hinweis: `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`
ist erwartetes lokales Verhalten.

## Naechster sinnvoller Block

Weiter lokal, mit Pre-Check und TDD. Sinnvolle kleine Kandidaten:

1. Terminal-Video-/Call-State defensiv pruefen:
   - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\terminal\TerminalContext.tsx`
   - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\video\IncomingCallOverlay.tsx`
   - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\app\terminal\[token]\page.tsx`
   - Ziel: keine leeren Namen/kaputten Avatar-/Offer-/mediaMode-Shapes in
     aktiven oder eingehenden Calls. Vorher grep-en, ob bereits Normalizer
     existieren.
2. Danach ggf. `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\app\terminal\[token]\page.tsx`
   weiter auf UI-Subtitle-/Count-Annahmen pruefen.
3. Falls Terminal erst einmal genug ist: neues Handover lesen und einen
   anderen offenen lokalen Haertungsblock nur nach `INBOX.md`-Softlock
   aufnehmen.

## Copy-Paste fuer Thomas

```text
Codex -> neue Session: bitte im Projekt C:\Users\thoma\Claud Code\Handy APP\nachbar-io weitermachen. Zuerst git status -sb, git log --oneline origin/master..HEAD, AGENTS.md, docs\plans\handoff\INBOX.md und docs\plans\handoff\2026-05-07-codex-new-session-handover-after-terminal-hardening-w3ab-w3ac.md lesen.

Kein Push/Deploy/Prod-DB/Vercel-Env/Secrets/Billing ohne Founder-GO. Stripe/Billing bleibt bis zur GmbH wartend. Bekannte untracked Altdateien nicht anfassen.

Aktueller lokaler Stand: master ist nach dem Handover voraussichtlich ahead 91 gegen origin/master. Zuletzt erledigt: W3ab GPIO-Bridge-Message-Shape-Haertung und W3ac Terminal-Device-Status-Count-Konsistenz, beide mit Pre-Check, TDD RED/GREEN, Vitest/ESLint/tsc/build gruen. Danach lokal mit dem nächsten sinnvollen Terminal-Härtungsblock weitermachen, mit Pre-Check und TDD; empfohlen ist Terminal-Video-/Call-State defensiv pruefen.
```
