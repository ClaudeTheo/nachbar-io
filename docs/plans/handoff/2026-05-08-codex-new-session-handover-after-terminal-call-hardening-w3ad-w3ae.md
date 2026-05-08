# Codex New-Session-Handover nach Terminal-Call-Haertung W3ad-W3ae

Datum: 2026-05-08 vormittag

## Fuer die naechste Session zuerst ausfuehren/lesen

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status -sb
git log --oneline origin/master..HEAD
Get-Content -Raw AGENTS.md
Get-Content -Raw docs\plans\handoff\INBOX.md
Get-Content -Raw docs\plans\handoff\2026-05-08-codex-new-session-handover-after-terminal-call-hardening-w3ad-w3ae.md
Get-Content -Raw docs\plans\2026-05-08-terminal-call-state-haertung-w3ad.md
Get-Content -Raw docs\plans\2026-05-08-terminal-call-ui-fallback-haertung-w3ae.md
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
- Vor diesem Handover-Commit: `master...origin/master [ahead 93]`.
- Nach diesem Handover-Commit voraussichtlich: `ahead 94`.
- Kein Push/Deploy/Prod-DB/Vercel-Env/Secrets/Billing gemacht.
- Arbeitsbaum vor diesem Handover hatte nur bekannte untracked Altdateien:
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\.codex-welle-d-3001.pid`
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-04-quartier-info-skalierung-auto-first.md`
  - alte `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-03-*` / `2026-05-04-*` Founder-/Claude-Handdateien

## Letzte relevante Commits

- `49d4a63 fix(terminal): harden call ui fallbacks`
- `897fa18 fix(terminal): validate call state shapes`
- `abf7e0e docs(handoff): save terminal hardening session state`
- `cbc8ab1 fix(terminal): align status counts with normalized lists`
- `833e987 docs(handoff): claim terminal count consistency`
- `9bc2ef1 fix(terminal): validate gpio bridge status messages`

## Erledigt in W3ad

Dateien:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\terminal\TerminalContext.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\video\__tests__\TerminalCallIntegration.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-08-terminal-call-state-haertung-w3ad.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

Verhalten:

- `TerminalProvider` normalisiert `setIncomingCall` und `setActiveCall`.
- Eingehende Calls brauchen gueltige `callId`, `callerId` und ein Offer mit
  `type: "offer"` plus nichtleerem `sdp`; kaputte Incoming-Offers werden
  verworfen.
- Aktive Calls brauchen gueltige `callId` und `remoteUserId`.
- Leere Namen werden `Unbekannter Kontakt`, kaputte Avatare werden `null`,
  kaputtes `autoAnswer` wird `false`, ungueltige aktive `mediaMode` wird
  `video`, kaputte aktive Offers werden entfernt.
- RED zeigte ungefilterte Runtime-Werte wie leeren Namen, Objekt-Avatar und
  falsches Offer.

## Erledigt in W3ae

Dateien:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\video\KioskIncomingCall.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\video\KioskAudioOnlyScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\video\KioskActiveCall.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\video\__tests__\KioskIncomingCall.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\video\__tests__\KioskAudioOnlyScreen.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\video\__tests__\KioskActiveCall.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-08-terminal-call-ui-fallback-haertung-w3ae.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

Verhalten:

- `KioskIncomingCall`, `KioskAudioOnlyScreen` und `KioskActiveCall` rendern
  leere oder nicht-string Namen als `Unbekannter Kontakt`.
- Kaputte oder leere Avatar-Werte werden nicht als `<img>` gerendert, sondern
  fallen auf den Initialen-Fallback `U`.
- Bestehende Buttons, Countdown, WebRTC-Flow und Audio-only-Flow blieben
  unveraendert.
- RED zeigte vorher leere accessible Labels und `src="[object Object]"`.

## Verifikation zuletzt gruen

```powershell
npx vitest run components\terminal\video\__tests__\TerminalCallIntegration.test.tsx components\terminal\video\__tests__\KioskIncomingCall.test.tsx components\terminal\video\__tests__\KioskActiveCall.test.tsx components\terminal\video\__tests__\KioskAudioOnlyScreen.test.tsx components\terminal\video\__tests__\KioskVideochatScreen.test.tsx
npx eslint components\terminal\video\KioskIncomingCall.tsx components\terminal\video\KioskAudioOnlyScreen.tsx components\terminal\video\KioskActiveCall.tsx components\terminal\video\__tests__\KioskIncomingCall.test.tsx components\terminal\video\__tests__\KioskAudioOnlyScreen.test.tsx components\terminal\video\__tests__\KioskActiveCall.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Build-Hinweis: `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`
ist erwartetes lokales Verhalten.

## Naechster sinnvoller Block

Weiter lokal, mit Pre-Check und TDD. Sinnvolle kleine Kandidaten:

1. Terminal-Seite/Dashboard-Subtitles defensiv pruefen:
   - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\app\terminal\[token]\page.tsx`
   - Ziel: kaputte `lastCheckin`-, Count- oder Subtitle-Werte duerfen keine
     `Invalid Date`-/`NaN`-/leeren Labels im Senior-Dashboard erzeugen.
   - Vorher grep-en, ob bereits zentrale Terminal-Display-Normalizer existieren.
2. Danach ggf. Terminal-Video-Entry-Punkte gegen Direkt-Props weiter pruefen:
   - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\video\IncomingCallOverlay.tsx`
   - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\app\terminal\[token]\page.tsx`
3. Falls Terminal erst einmal genug ist: INBOX auf offene Softlocks pruefen und
   einen anderen lokalen Haertungsblock nur nach Pre-Check aufnehmen.

## Copy-Paste fuer Thomas

```text
Codex -> neue Session: bitte im Projekt C:\Users\thoma\Claud Code\Handy APP\nachbar-io weitermachen. Zuerst git status -sb, git log --oneline origin/master..HEAD, AGENTS.md, docs\plans\handoff\INBOX.md und docs\plans\handoff\2026-05-08-codex-new-session-handover-after-terminal-call-hardening-w3ad-w3ae.md lesen.

Kein Push/Deploy/Prod-DB/Vercel-Env/Secrets/Billing ohne Founder-GO. Stripe/Billing bleibt bis zur GmbH wartend. Bekannte untracked Altdateien nicht anfassen.

Aktueller lokaler Stand: master ist nach dem Handover voraussichtlich ahead 94 gegen origin/master. Zuletzt erledigt: W3ad Terminal-Call-State-Haertung und W3ae Terminal-Call-UI-Fallback-Haertung, beide mit Pre-Check, TDD RED/GREEN, Vitest/ESLint/tsc/build gruen. Danach lokal mit dem nächsten sinnvollen Terminal-Härtungsblock weitermachen, mit Pre-Check und TDD; empfohlen ist Terminal-Seite/Dashboard-Subtitles defensiv pruefen.
```
