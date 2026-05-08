# Terminal Call-State-Haertung W3ad

Datum: 2026-05-08 vormittag

## Ziel

Terminal-Video-/Call-State defensiv gegen kaputte Runtime-Daten haerten, damit
aktive und eingehende Calls keine leeren Namen, kaputten Avatar-Werte, kaputten
Offer-Shapes oder ungueltigen `mediaMode` in die Call-UI durchreichen.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "incomingCall|IncomingCall|activeCall|callState|video|Videochat|mediaMode|avatar|offer|TerminalContext|normalize.*call|call.*normalize" -S .
rg --files -g '*Terminal*' -g '*Video*' -g '*Call*' -g '*terminal*' -g '*video*' -g '*call*'
```

Ergebnis:

- Bestehende Terminal-Call-Infrastruktur gefunden:
  - `lib/terminal/TerminalContext.tsx`
  - `components/terminal/video/IncomingCallOverlay.tsx`
  - `components/terminal/video/KioskIncomingCall.tsx`
  - `components/terminal/video/KioskActiveCall.tsx`
  - `components/terminal/video/__tests__/TerminalCallIntegration.test.tsx`
- Kein neuer Service/keine neue Lib noetig. Umsetzung als Adapter/Normalizer
  direkt im bestehenden `TerminalContext`.

## TDD

RED:

```powershell
npx vitest run components\terminal\video\__tests__\TerminalCallIntegration.test.tsx
```

Erwartete rote Assertions:

- leerer `callerName` blieb leer statt `Unbekannter Kontakt`
- kaputter Avatar blieb als Objekt im State
- kaputtes Incoming-Offer wurde nicht verworfen
- ungueltige aktive `mediaMode` blieb unveraendert

GREEN:

- `normalizeIncomingCallData` validiert `callId`, `callerId` und Offer.
- Eingehende Calls mit kaputtem Offer werden verworfen.
- Leere Namen werden zu `Unbekannter Kontakt`.
- Kaputte/leer getrimmte Avatar-Werte werden `null`.
- Kaputtes `autoAnswer` wird `false`.
- `normalizeActiveCallData` validiert `callId` und `remoteUserId`, normalisiert
  Namen, entfernt kaputte Offers und faellt bei ungueltigem `mediaMode` auf
  `video` zurueck.
- `TerminalProvider` nutzt die Normalizer in `setIncomingCall` und
  `setActiveCall`.

## Verifikation

Gruen:

```powershell
npx vitest run components\terminal\video\__tests__\TerminalCallIntegration.test.tsx
npx vitest run components\terminal\video\__tests__\TerminalCallIntegration.test.tsx components\terminal\video\__tests__\KioskIncomingCall.test.tsx components\terminal\video\__tests__\KioskActiveCall.test.tsx components\terminal\video\__tests__\KioskAudioOnlyScreen.test.tsx components\terminal\video\__tests__\KioskVideochatScreen.test.tsx
npx eslint lib\terminal\TerminalContext.tsx components\terminal\video\__tests__\TerminalCallIntegration.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Build-Hinweis:

- `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert` ist erwartetes
  lokales Verhalten, Stripe/Billing bleibt bis zur GmbH wartend.

## Rote Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.
