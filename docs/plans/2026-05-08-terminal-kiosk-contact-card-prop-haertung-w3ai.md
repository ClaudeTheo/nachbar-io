# Terminal KioskContactCard-Prop-Haertung W3ai

Datum: 2026-05-08 nachmittag

## Ziel

`KioskContactCard` defensiv gegen direkte kaputte Kontakt-Props haerten, damit
die Videochat-Kontaktkarte keine leeren Namen, kaputten Avatar-`src`,
`[object Object]`-Texte oder truthy Online-Status aus falsch geformten Props
rendert.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "KioskContactCard|ContactCard|autoAnswer|callerAvatar|avatar|contact.*name|normalize.*Contact|resolve.*Contact|contacts" app\terminal components\terminal lib\terminal __tests__ components\terminal\video\__tests__ -S
rg --files app\terminal components\terminal lib\terminal __tests__ | rg "(Contact|contact|Videochat|terminal|Terminal)"
Get-Content -Raw components\terminal\video\KioskContactCard.tsx
Get-Content -Raw components\terminal\screens\VideochatScreen.tsx
Get-Content -Raw components\terminal\video\__tests__\KioskVideochatScreen.test.tsx
Get-Content -Raw components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
```

Ergebnis:

- Bestehende Komponente gefunden:
  - `components/terminal/video/KioskContactCard.tsx`
- Bestehende Listen-Normalisierung gefunden:
  - `normalizeContacts` in `components/terminal/screens/VideochatScreen.tsx`
- Die Kontaktliste filtert API-Items bereits, die Card selbst vertraute aber
  direkten Props noch.
- Kein Neubau noetig. Umsetzung als lokale Prop-Fallbacks in der bestehenden
  Card.

## TDD

RED:

```powershell
npx vitest run components\terminal\video\__tests__\KioskContactCard.test.tsx
```

Erwarteter roter Fehler:

- `KioskContactCard` crashte bei Objekt-`name` mit
  `Objects are not valid as a React child`.

GREEN:

- `resolveContactName` liefert `Unbekannter Kontakt` fuer nicht-Strings oder
  leere Strings.
- `resolveNullableText` akzeptiert nur nicht-leere Strings fuer Avatar und
  Auto-Answer-Hinweis.
- `isOnline` gilt nur bei echtem Boolean `true` als online.
- Button-Label, Avatar-Fallback und Status verwenden die normalisierten Werte.

## Verifikation

Gruen:

```powershell
npx vitest run components\terminal\video\__tests__\KioskContactCard.test.tsx
npx vitest run components\terminal\video\__tests__\KioskContactCard.test.tsx components\terminal\video\__tests__\KioskVideochatScreen.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx eslint components\terminal\video\KioskContactCard.tsx components\terminal\video\__tests__\KioskContactCard.test.tsx
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
