# Terminal Call-UI-Fallback-Haertung W3ae

Datum: 2026-05-08 vormittag

## Ziel

Terminal-Call-Komponenten rendern auch dann stabile Namen und Avatar-Fallbacks,
wenn sie direkt mit leeren Namen oder kaputten Avatar-Werten gerendert werden.
Das ist die UI-Ergaenzung zu W3ad, wo der Terminal-Context bereits Call-State
normalisiert.

## Pre-Check

Ausgefuehrt:

```powershell
git status -sb
rg -n "callerName|callerAvatar|Unbekannter Kontakt|normalize.*Name|Avatar|KioskIncomingCall|KioskAudioOnlyScreen|KioskActiveCall" components\terminal\video components\terminal\video\__tests__ lib\terminal app\terminal -S
rg --files components\terminal\video components\terminal\video\__tests__ lib\terminal app\terminal
```

Ergebnis:

- Bestehende Call-UI-Komponenten gefunden:
  - `components/terminal/video/KioskIncomingCall.tsx`
  - `components/terminal/video/KioskAudioOnlyScreen.tsx`
  - `components/terminal/video/KioskActiveCall.tsx`
- Bestehende Tests gefunden und erweitert.
- Kein neuer Screen/Service noetig.

## TDD

RED:

```powershell
npx vitest run components\terminal\video\__tests__\KioskIncomingCall.test.tsx components\terminal\video\__tests__\KioskAudioOnlyScreen.test.tsx components\terminal\video\__tests__\KioskActiveCall.test.tsx
```

Erwartete rote Fehler:

- `KioskIncomingCall` hatte `aria-label="Eingehender Anruf von    "` und
  renderte kaputten Avatar als `src="[object Object]"`.
- `KioskAudioOnlyScreen` hatte `aria-label="Audioanruf mit    "` und renderte
  kaputten Avatar als `src="[object Object]"`.
- `KioskActiveCall` hatte `aria-label="Videoanruf mit    "` und leeren Namen in
  der Statusleiste.

GREEN:

- `KioskIncomingCall`, `KioskAudioOnlyScreen` und `KioskActiveCall` nutzen
  lokale Display-Fallbacks.
- Leere oder nicht-string Namen werden als `Unbekannter Kontakt` angezeigt.
- Kaputte oder leere Avatar-Werte werden nicht als `<img>` gerendert; stattdessen
  erscheint der Initialen-Fallback `U`.
- Bestehende Buttons, Countdown, WebRTC-Flow und Audio-only-Flow bleiben
  unveraendert.

## Verifikation

Gruen:

```powershell
npx vitest run components\terminal\video\__tests__\KioskIncomingCall.test.tsx components\terminal\video\__tests__\KioskAudioOnlyScreen.test.tsx components\terminal\video\__tests__\KioskActiveCall.test.tsx
npx vitest run components\terminal\video\__tests__\TerminalCallIntegration.test.tsx components\terminal\video\__tests__\KioskIncomingCall.test.tsx components\terminal\video\__tests__\KioskActiveCall.test.tsx components\terminal\video\__tests__\KioskAudioOnlyScreen.test.tsx components\terminal\video\__tests__\KioskVideochatScreen.test.tsx
npx eslint components\terminal\video\KioskIncomingCall.tsx components\terminal\video\KioskAudioOnlyScreen.tsx components\terminal\video\KioskActiveCall.tsx components\terminal\video\__tests__\KioskIncomingCall.test.tsx components\terminal\video\__tests__\KioskAudioOnlyScreen.test.tsx components\terminal\video\__tests__\KioskActiveCall.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Build-Hinweis:

- `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert` ist erwartetes
  lokales Verhalten.

## Rote Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.
Stripe/Billing bleibt bis zur GmbH wartend.
