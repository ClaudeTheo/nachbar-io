# Codex New-Session-Handover nach Terminal-Haertung W3ah-W3ak

Datum: 2026-05-08 nachmittag

## Fuer die naechste Session zuerst ausfuehren/lesen

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status -sb
git log --oneline origin/master..HEAD
Get-Content -Raw AGENTS.md
Get-Content -Raw docs\plans\handoff\INBOX.md
Get-Content -Raw docs\plans\handoff\2026-05-08-codex-new-session-handover-after-terminal-hardening-w3ah-w3ak.md
Get-Content -Raw docs\plans\2026-05-08-terminal-active-call-toggle-haertung-w3ah.md
Get-Content -Raw docs\plans\2026-05-08-terminal-kiosk-contact-card-prop-haertung-w3ai.md
Get-Content -Raw docs\plans\2026-05-08-terminal-video-auto-answer-haertung-w3aj.md
Get-Content -Raw docs\plans\2026-05-08-terminal-news-screen-context-haertung-w3ak.md
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
- Vor diesem Handover-Commit: `master...origin/master [ahead 105]`.
- Nach diesem Handover-Commit voraussichtlich: `ahead 106`.
- Kein Push/Deploy/Prod-DB/Vercel-Env/Secrets/Billing gemacht.
- Arbeitsbaum vor diesem Handover hatte nur bekannte untracked Altdateien:
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\.codex-welle-d-3001.pid`
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-04-quartier-info-skalierung-auto-first.md`
  - alte `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-03-*` / `2026-05-04-*` Founder-/Claude-Handdateien

## Letzte relevante Commits

- `ef527ac fix(terminal): harden news screen context data`
- `e08c23d docs(handoff): claim terminal news screen hardening`
- `c8ed981 fix(terminal): harden video auto answer guards`
- `5008c9a docs(handoff): claim terminal auto answer hardening`
- `4c9ce21 fix(terminal): harden contact card fallbacks`
- `eb2ecb8 docs(handoff): claim terminal contact card hardening`
- `4f14c25 fix(terminal): harden active call toggles`
- `7104bce docs(handoff): claim terminal active call hardening`
- `268324d docs(handoff): save terminal overlay hardening state`

## Erledigt in W3ah

Dateien:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\app\terminal\[token]\page.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\app\terminal\page.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-08-terminal-active-call-toggle-haertung-w3ah.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

Verhalten:

- `TerminalPage` normalisiert `activeCall` im `active-call`-Branch mit
  bestehendem `normalizeActiveCallData`.
- Ungueltige aktive Calls fallen aufs Dashboard zurueck.
- Video-/Audio-only-Umschaltungen reichen nur normalisierte Call-Daten an
  `setActiveCall` weiter.
- RED zeigte vorher rohe IDs/Namen, kaputtes `isInitiator` und kaputte Offers
  beim Umschalten.

## Erledigt in W3ai

Dateien:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\video\KioskContactCard.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\video\__tests__\KioskContactCard.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-08-terminal-kiosk-contact-card-prop-haertung-w3ai.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

Verhalten:

- `KioskContactCard` rendert direkte kaputte Kontakt-Props stabil.
- Fallback-Name: `Unbekannter Kontakt`.
- Objekt-/Leer-Avatar und Objekt-/Leer-Hinweise werden nicht gerendert.
- `isOnline` gilt nur bei echtem Boolean `true` als online.
- RED crashte vorher bei Objekt-`name` mit React-Child-Fehler.

## Erledigt in W3aj

Dateien:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\video\KioskIncomingCall.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\video\__tests__\KioskIncomingCall.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\VideochatScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\video\__tests__\KioskVideochatScreen.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-08-terminal-video-auto-answer-haertung-w3aj.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

Verhalten:

- `KioskIncomingCall` aktiviert Auto-Answer nur bei echtem Boolean `true`.
- Kaputte Werte wie `"yes"` werden wie normales Klingeln behandelt.
- `VideochatScreen` zeigt Auto-Answer-Zeitfenster nur bei validem
  `HH:mm-HH:mm`.
- RED zeigte vorher Auto-Answer bei `"yes"` und sichtbares `gleich-` als
  kaputten Zeittext.

## Erledigt in W3ak

Dateien:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\NewsScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\terminal\useTerminalData.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-08-terminal-news-screen-context-haertung-w3ak.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

Verhalten:

- Bestehender `normalizeNews`-Adapter aus `useTerminalData.ts` wurde exportiert.
- `NewsScreen` nutzt `normalizeNews(data?.news)` statt rohe Context-News direkt.
- Kaputte direkte `news`-Shapes werden wie leere Liste behandelt.
- Kaputte Eintraege werden vor `NewsCard` gefiltert.
- RED zeigte vorher `news.map is not a function` und `Cannot read properties
  of null`.

## Verifikation zuletzt gruen

W3ah:

```powershell
npx vitest run __tests__\app\terminal\page.test.tsx
npx vitest run __tests__\app\terminal\page.test.tsx components\terminal\video\__tests__\TerminalCallIntegration.test.tsx components\terminal\video\__tests__\KioskActiveCall.test.tsx components\terminal\video\__tests__\KioskAudioOnlyScreen.test.tsx components\terminal\video\__tests__\IncomingCallOverlay.test.tsx
npx eslint app\terminal\[token]\page.tsx __tests__\app\terminal\page.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

W3ai:

```powershell
npx vitest run components\terminal\video\__tests__\KioskContactCard.test.tsx
npx vitest run components\terminal\video\__tests__\KioskContactCard.test.tsx components\terminal\video\__tests__\KioskVideochatScreen.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx eslint components\terminal\video\KioskContactCard.tsx components\terminal\video\__tests__\KioskContactCard.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

W3aj:

```powershell
npx vitest run components\terminal\video\__tests__\KioskIncomingCall.test.tsx components\terminal\video\__tests__\KioskVideochatScreen.test.tsx
npx vitest run components\terminal\video\__tests__\KioskIncomingCall.test.tsx components\terminal\video\__tests__\KioskVideochatScreen.test.tsx components\terminal\video\__tests__\IncomingCallOverlay.test.tsx components\terminal\video\__tests__\KioskContactCard.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx eslint components\terminal\video\KioskIncomingCall.tsx components\terminal\video\__tests__\KioskIncomingCall.test.tsx components\terminal\screens\VideochatScreen.tsx components\terminal\video\__tests__\KioskVideochatScreen.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

W3ak:

```powershell
npx vitest run components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx
npx vitest run components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx __tests__\app\terminal\page.test.tsx
npx eslint components\terminal\screens\NewsScreen.tsx components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx lib\terminal\useTerminalData.ts __tests__\lib\terminal\useTerminalData.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Build-Hinweis: `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert`
ist erwartetes lokales Verhalten.

## Arbeitsmodus fuer naechste Session

Thomas hat zuletzt gewuenscht: in groesseren zusammenhaengenden Schritten
weiterarbeiten, damit er nicht nach jedem kleinen Block "weiter" sagen muss.
Praktisch:

- weiter kleine, klar zusammenhaengende Wellen buendeln;
- trotzdem je Block Pre-Check zuerst;
- TDD RED/GREEN je Verhaltensaenderung;
- lokale Commits nach erfolgreicher Verifikation;
- keine roten Zonen ohne Founder-GO.

## Naechste sinnvolle Kandidaten

Weiter lokal, mit Pre-Check und TDD:

1. `components\terminal\screens\ErinnerungenScreen.tsx` Screen-Grenze weiter
   pruefen:
   - Ziel: auch bei direkten kaputten Context-/Fetch-Werten keine rohen
     Datum-/Titelwerte, keine `Invalid Date`, keine kaputten Gruppierungen.
   - Es gibt bereits Guards in `TerminalReminderArrayGuards.test.tsx`; zuerst
     Pre-Check, ob die offenen Ränder schon abgedeckt sind.
2. `components\terminal\screens\VideoCallScreen.tsx` pruefen:
   - Ziel: `nextSlot`/Terminwerte gegen kaputte `scheduled_at`, `host_name`,
     `status` und Titel absichern.
   - Pre-Check auf bestehende Slot-/Consultation-Normalisierung.
3. `components\terminal\TerminalHeader.tsx` / `ScreensaverOverlay.tsx`
   Wetter-Temp-Display pruefen:
   - Ziel: direkte `data.weather.temp`-Kaputtwerte nicht als `NaN°C`,
     `Infinity°C` oder Objekttext rendern.
   - Achtung: Forecast-Array-Guards existieren bereits.

## Copy-Paste fuer Thomas

```text
Codex -> neue Session: bitte im Projekt C:\Users\thoma\Claud Code\Handy APP\nachbar-io weitermachen. Zuerst git status -sb, git log --oneline origin/master..HEAD, AGENTS.md, docs\plans\handoff\INBOX.md und docs\plans\handoff\2026-05-08-codex-new-session-handover-after-terminal-hardening-w3ah-w3ak.md lesen.

Kein Push/Deploy/Prod-DB/Vercel-Env/Secrets/Billing ohne Founder-GO. Stripe/Billing bleibt bis zur GmbH wartend. Bekannte untracked Altdateien nicht anfassen.

Aktueller lokaler Stand: master ist nach dem Handover voraussichtlich ahead 106 gegen origin/master. Zuletzt erledigt: W3ah activeCall-Umschaltung, W3ai KioskContactCard-Props, W3aj Video-Auto-Answer und W3ak NewsScreen-Context-Haertung, jeweils mit Pre-Check, TDD RED/GREEN, Vitest/ESLint/tsc/build gruen. Thomas moechte weitere Arbeit in groesseren zusammenhaengenden Schritten, nicht nach jedem Mini-Block stoppen. Naechster sinnvoller Terminal-Block: ErinnerungenScreen oder VideoCallScreen Screen-Grenzen mit Pre-Check und TDD pruefen.
```
