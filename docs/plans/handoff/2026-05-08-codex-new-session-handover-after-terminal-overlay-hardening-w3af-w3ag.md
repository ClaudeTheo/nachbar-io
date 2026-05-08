# Codex New-Session-Handover nach Terminal-Haertung W3af-W3ag

Datum: 2026-05-08 mittag

## Fuer die naechste Session zuerst ausfuehren/lesen

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status -sb
git log --oneline origin/master..HEAD
Get-Content -Raw AGENTS.md
Get-Content -Raw docs\plans\handoff\INBOX.md
Get-Content -Raw docs\plans\handoff\2026-05-08-codex-new-session-handover-after-terminal-overlay-hardening-w3af-w3ag.md
Get-Content -Raw docs\plans\2026-05-08-terminal-dashboard-subtitle-haertung-w3af.md
Get-Content -Raw docs\plans\2026-05-08-terminal-incoming-call-overlay-entry-haertung-w3ag.md
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
- Vor diesem Handover-Commit: `master...origin/master [ahead 96]`.
- Nach diesem Handover-Commit voraussichtlich: `ahead 97`.
- Kein Push/Deploy/Prod-DB/Vercel-Env/Secrets/Billing gemacht.
- Arbeitsbaum vor diesem Handover hatte nur bekannte untracked Altdateien:
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\.codex-welle-d-3001.pid`
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-04-quartier-info-skalierung-auto-first.md`
  - alte `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-03-*` / `2026-05-04-*` Founder-/Claude-Handdateien

## Letzte relevante Commits

- `985e8d8 fix(terminal): validate incoming call overlay state`
- `6d7f88a fix(terminal): harden dashboard subtitles`
- `6c4d56f docs(handoff): save terminal call hardening session state`
- `49d4a63 fix(terminal): harden call ui fallbacks`
- `897fa18 fix(terminal): validate call state shapes`
- `abf7e0e docs(handoff): save terminal hardening session state`

## Erledigt in W3af

Dateien:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\app\terminal\[token]\page.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\app\terminal\page.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-08-terminal-dashboard-subtitle-haertung-w3af.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

Verhalten:

- Terminal-Dashboard-Subtitles werden lokal vor der Anzeige abgesichert.
- `asDashboardDate` akzeptiert nur parsebare String-Daten.
- `asDashboardCount` akzeptiert nur positive finite Zahlen.
- Kaputte Werte fuer `lastCheckin`, `newsCount`, `photosCount`,
  `stickiesCount` oder `appointmentsToday` fallen auf ruhige bestehende
  Fallbacks zurueck.
- RED zeigte vorher `Letztes: Invalid Date Uhr`.

## Erledigt in W3ag

Dateien:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\video\IncomingCallOverlay.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\video\__tests__\IncomingCallOverlay.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-08-terminal-incoming-call-overlay-entry-haertung-w3ag.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

Verhalten:

- `IncomingCallOverlay` nutzt jetzt den bestehenden
  `normalizeIncomingCallData`-Adapter.
- Kaputte direkte Context-Calls, z.B. mit `offer.type: "answer"`, rendern kein
  Overlay mehr.
- Gueltige, aber unsaubere Calls werden vor dem Weiterreichen an `setActiveCall`
  normalisiert: getrimmte IDs, Fallback-Name `Unbekannter Kontakt`, valides
  Offer.
- Bestehender Annehmen-/Ablehnen-Flow bleibt unveraendert.

## Verifikation zuletzt gruen

```powershell
npx vitest run __tests__\app\terminal\page.test.tsx
npx vitest run __tests__\app\terminal\page.test.tsx __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx
npx eslint app\terminal\[token]\page.tsx __tests__\app\terminal\page.test.tsx
npx vitest run components\terminal\video\__tests__\IncomingCallOverlay.test.tsx
npx vitest run components\terminal\video\__tests__\IncomingCallOverlay.test.tsx components\terminal\video\__tests__\TerminalCallIntegration.test.tsx components\terminal\video\__tests__\KioskIncomingCall.test.tsx components\terminal\video\__tests__\KioskActiveCall.test.tsx components\terminal\video\__tests__\KioskAudioOnlyScreen.test.tsx
npx eslint components\terminal\video\IncomingCallOverlay.tsx components\terminal\video\__tests__\IncomingCallOverlay.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Build-Hinweis: `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert`
ist erwartetes lokales Verhalten.

## Naechster sinnvoller Block

Weiter lokal, mit Pre-Check und TDD. Sinnvolle kleine Kandidaten:

1. Terminal-Video-Entry-Punkt in `app\terminal\[token]\page.tsx` weiter
   pruefen:
   - Ziel: `activeCall`-Direktwerte duerfen beim Umschalten zwischen Video und
     Audio-only keine kaputten Namen/IDs/MediaModes weitertragen.
   - Pre-Check gegen `normalizeActiveCallData`, `KioskActiveCall` und
     `KioskAudioOnlyScreen` zuerst.
2. Danach ggf. `KioskContactCard` gegen direkte kaputte Kontakt-Props pruefen:
   - Ziel: keine leeren Namen, kaputten Avatar-src oder kaputten Auto-Answer-
     Texte in Kontaktkarten.
3. Falls Terminal genug ist: INBOX auf offene Softlocks pruefen und anderen
   lokalen Haertungsblock nur nach Pre-Check aufnehmen.

## Copy-Paste fuer Thomas

```text
Codex -> neue Session: bitte im Projekt C:\Users\thoma\Claud Code\Handy APP\nachbar-io weitermachen. Zuerst git status -sb, git log --oneline origin/master..HEAD, AGENTS.md, docs\plans\handoff\INBOX.md und docs\plans\handoff\2026-05-08-codex-new-session-handover-after-terminal-overlay-hardening-w3af-w3ag.md lesen.

Kein Push/Deploy/Prod-DB/Vercel-Env/Secrets/Billing ohne Founder-GO. Stripe/Billing bleibt bis zur GmbH wartend. Bekannte untracked Altdateien nicht anfassen.

Aktueller lokaler Stand: master ist nach dem Handover voraussichtlich ahead 97 gegen origin/master. Zuletzt erledigt: W3af Terminal-Dashboard-Subtitle-Haertung und W3ag IncomingCallOverlay-Entry-Haertung, beide mit Pre-Check, TDD RED/GREEN, Vitest/ESLint/tsc/build gruen. Danach lokal mit dem nächsten sinnvollen Terminal-Härtungsblock weitermachen, mit Pre-Check und TDD; empfohlen ist activeCall-Umschaltung in app\terminal\[token]\page.tsx defensiv pruefen.
```
