# Terminal Video-Auto-Answer-Haertung W3aj

Datum: 2026-05-08 nachmittag

## Ziel

Terminal-Video-UI gegen kaputte Auto-Answer-Werte haerten:

- `KioskIncomingCall` soll Auto-Answer nur bei echtem Boolean `true`
  aktivieren.
- `VideochatScreen` soll Auto-Answer-Zeitfenster nur mit validem `HH:mm-HH:mm`
  anzeigen.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "autoAnswer|auto_answer|KioskIncomingCall|KioskContactCard|VideochatScreen|formatAutoAnswerInfo|callerAvatar|callerName|isOnline|data-online|normalizeContacts|resolveCaller|resolveContact" components\terminal app\terminal lib\terminal __tests__\app\terminal components\terminal\video\__tests__ components\terminal\__tests__ -S
Get-Content -Raw components\terminal\video\KioskIncomingCall.tsx
Get-Content -Raw components\terminal\video\__tests__\KioskIncomingCall.test.tsx
Get-Content -Raw components\terminal\screens\VideochatScreen.tsx
Get-Content -Raw components\terminal\video\__tests__\KioskVideochatScreen.test.tsx
```

Ergebnis:

- Bestehende UI-Fallbacks fuer Namen/Avatare gefunden.
- Bestehende Kontaktlisten-Normalisierung gefunden:
  - `normalizeContacts` in `VideochatScreen`
- Offene Kanten:
  - `KioskIncomingCall` nutzte `autoAnswer` truthy.
  - `VideochatScreen` zeigte nicht-leere, aber ungueltige Zeitstrings direkt im
    Auto-Answer-Hinweis.
- Kein Neubau noetig. Umsetzung in den bestehenden Komponenten.

## TDD

RED:

```powershell
npx vitest run components\terminal\video\__tests__\KioskIncomingCall.test.tsx components\terminal\video\__tests__\KioskVideochatScreen.test.tsx
```

Erwartete rote Fehler:

- `autoAnswer="yes"` zeigte den Auto-Answer-Countdown statt normales Klingeln.
- `auto_answer_start: "gleich"` und leerer Endwert wurden als
  `Wird automatisch angenommen gleich-` sichtbar.

GREEN:

- `KioskIncomingCall` verwendet intern `autoAnswerEnabled = autoAnswer === true`.
- Countdown, Ringtone und Button-Variante haengen an `autoAnswerEnabled`.
- `VideochatScreen` normalisiert Zeitfenster auf valides `HH:mm`.
- `formatAutoAnswerInfo` zeigt den Hinweis nur, wenn Start und Ende gueltig sind.

## Verifikation

Gruen:

```powershell
npx vitest run components\terminal\video\__tests__\KioskIncomingCall.test.tsx components\terminal\video\__tests__\KioskVideochatScreen.test.tsx
npx vitest run components\terminal\video\__tests__\KioskIncomingCall.test.tsx components\terminal\video\__tests__\KioskVideochatScreen.test.tsx components\terminal\video\__tests__\IncomingCallOverlay.test.tsx components\terminal\video\__tests__\KioskContactCard.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx eslint components\terminal\video\KioskIncomingCall.tsx components\terminal\video\__tests__\KioskIncomingCall.test.tsx components\terminal\screens\VideochatScreen.tsx components\terminal\video\__tests__\KioskVideochatScreen.test.tsx
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
