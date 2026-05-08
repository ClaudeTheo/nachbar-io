# Terminal IncomingCallOverlay-Entry-Haertung W3ag

Datum: 2026-05-08 mittag

## Ziel

`IncomingCallOverlay` als direkten Terminal-Call-Entry-Point defensiv gegen
kaputte Context-Werte haerten. Auch wenn ein kaputter Incoming-Call direkt ins
Overlay gelangt, darf kein kaputtes Offer gerendert oder ungepruefter
Call-State in `active-call` weitergereicht werden.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "IncomingCallOverlay|incomingCall|callerName|callerAvatar|autoAnswer|Unbekannter Kontakt|normalize.*Call|normalize.*Name|avatar|offer" components\terminal\video app\terminal lib\terminal __tests__ -S
rg --files components\terminal\video components\terminal\video\__tests__ app\terminal lib\terminal | rg "(IncomingCall|Overlay|Call|Terminal|page|test)"
Get-Content -Raw components\terminal\video\IncomingCallOverlay.tsx
Get-Content -Raw components\terminal\video\__tests__\KioskIncomingCall.test.tsx
Get-Content -Raw components\terminal\video\__tests__\TerminalCallIntegration.test.tsx
```

Ergebnis:

- Bestehende Normalisierung gefunden:
  - `normalizeIncomingCallData` in `lib/terminal/TerminalContext.tsx`
- Bestehende UI-Fallbacks gefunden:
  - `KioskIncomingCall`
- `IncomingCallOverlay` selbst vertraute dem Context-Wert noch direkt.
- Kein neuer Service/keine neue Lib noetig. Umsetzung als Adapter auf die
  bestehende Call-Normalisierung.

## TDD

RED:

```powershell
npx vitest run components\terminal\video\__tests__\IncomingCallOverlay.test.tsx
```

Erwartete rote Fehler:

- Ein Incoming-Call mit `offer.type: "answer"` wurde trotzdem als Overlay
  gerendert.
- Beim Annehmen wurden ungepruefte IDs und leere Namen an `setActiveCall`
  weitergereicht.

GREEN:

- `IncomingCallOverlay` nutzt `normalizeIncomingCallData(incomingCall)`.
- Kaputte Calls rendern kein Overlay.
- Gueltige, aber unsaubere Calls werden vor dem Weiterreichen normalisiert.
- Bestehender `KioskIncomingCall`-Flow fuer Annehmen/Ablehnen bleibt erhalten.

## Verifikation

Gruen:

```powershell
npx vitest run components\terminal\video\__tests__\IncomingCallOverlay.test.tsx
npx vitest run components\terminal\video\__tests__\IncomingCallOverlay.test.tsx components\terminal\video\__tests__\TerminalCallIntegration.test.tsx components\terminal\video\__tests__\KioskIncomingCall.test.tsx components\terminal\video\__tests__\KioskActiveCall.test.tsx components\terminal\video\__tests__\KioskAudioOnlyScreen.test.tsx
npx eslint components\terminal\video\IncomingCallOverlay.tsx components\terminal\video\__tests__\IncomingCallOverlay.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Build-Hinweis:

- `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert` ist erwartetes
  lokales Verhalten.

## Rote Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.

Stripe/Billing bleibt bis zur GmbH wartend.
