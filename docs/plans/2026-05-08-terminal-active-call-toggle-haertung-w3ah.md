# Terminal activeCall-Umschalt-Haertung W3ah

Datum: 2026-05-08 nachmittag

## Ziel

`app/terminal/[token]/page.tsx` defensiv gegen kaputte `activeCall`-Direktwerte
haerten. Beim Umschalten zwischen Video und Audio-only darf die Terminal-Seite
keine rohen IDs, leeren Namen, kaputten `isInitiator`-Werte, ungueltige Offers
oder ungueltige `mediaMode`-Werte an `setActiveCall` weiterreichen.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "activeCall|setActiveCall|normalizeActiveCallData|KioskActiveCall|KioskAudioOnlyScreen|mediaMode" app\terminal components\terminal lib\terminal __tests__\app\terminal components\terminal\video\__tests__
Get-Content -Raw app\terminal\[token]\page.tsx
Get-Content -Raw __tests__\app\terminal\page.test.tsx
Get-Content -Raw lib\terminal\TerminalContext.tsx
Get-Content -Raw components\terminal\video\KioskActiveCall.tsx
Get-Content -Raw components\terminal\video\KioskAudioOnlyScreen.tsx
Get-Content -Raw components\terminal\video\__tests__\TerminalCallIntegration.test.tsx
```

Ergebnis:

- Bestehende Normalisierung gefunden:
  - `normalizeActiveCallData` in `lib/terminal/TerminalContext.tsx`
- Bestehende UI-Fallbacks gefunden:
  - `KioskActiveCall`
  - `KioskAudioOnlyScreen`
- `app/terminal/[token]/page.tsx` nutzte `activeCall` beim Umschalten noch
  direkt.
- Kein neuer Service/keine neue Lib noetig. Umsetzung als Adapter-Nutzung in
  der bestehenden Terminal-Seite.

## TDD

RED:

```powershell
npx vitest run __tests__\app\terminal\page.test.tsx
```

Erwartete rote Fehler:

- Beim Wechsel zu `audio-only` wurden rohe `callId`-/`remoteUserId`-Strings,
  ein leerer Name, ein kaputtes `isInitiator` und ein kaputtes Answer-Offer an
  `setActiveCall` weitergegeben.
- Beim erneuten Video-Versuch passierte dasselbe in Gegenrichtung.

GREEN:

- `TerminalPage` normalisiert `activeCall` im `active-call`-Branch mit
  `normalizeActiveCallData`.
- Ungueltige aktive Calls fallen auf das Dashboard zurueck.
- Video- und Audio-only-Komponenten bekommen nur normalisierte Werte.
- `onAudioOnly` und `onRetryVideo` setzen jeweils normalisierte Call-Daten mit
  der Ziel-`mediaMode`.

## Verifikation

Gruen:

```powershell
npx vitest run __tests__\app\terminal\page.test.tsx
npx vitest run __tests__\app\terminal\page.test.tsx components\terminal\video\__tests__\TerminalCallIntegration.test.tsx components\terminal\video\__tests__\KioskActiveCall.test.tsx components\terminal\video\__tests__\KioskAudioOnlyScreen.test.tsx components\terminal\video\__tests__\IncomingCallOverlay.test.tsx
npx eslint app\terminal\[token]\page.tsx __tests__\app\terminal\page.test.tsx
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
