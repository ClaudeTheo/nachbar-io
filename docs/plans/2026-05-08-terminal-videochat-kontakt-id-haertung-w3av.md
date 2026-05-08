# Terminal Videochat-Kontakt-ID-Haertung W3av

Datum: 2026-05-08 abend

## Ziel

`VideochatScreen` soll Kontakt-ID- und Namensstrings aus der Device-Contacts-API
getrimmt in den lokalen State uebernehmen. Sichtbare Namen wurden durch
`KioskContactCard` bereits stabil dargestellt, aber `caregiver_id` wurde beim
Anruf noch roh weitergereicht.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "function normalize|function as|isNonEmptyString|return \[\{|\.trim\(|TODO|Kaputt|Fallback|unknown|unknown\)" components/terminal lib/terminal app/terminal __tests__/lib/terminal components/terminal/__tests__
rg -n "fetch\(" components/terminal app/terminal lib/terminal
```

Ergebnis:

- Bestehende Infrastruktur gefunden:
  - `components/terminal/screens/VideochatScreen.tsx`: `normalizeContacts`,
    `normalizeTimeWindowLabel`
  - `components/terminal/video/KioskContactCard.tsx`: sichtbare Name-/Avatar-
    Fallbacks
  - `components/terminal/video/__tests__/KioskVideochatScreen.test.tsx`
- Kein Neubau. Bestehende Kontakt-Normalisierung erweitert.

## TDD

RED:

```powershell
npx vitest run components\terminal\video\__tests__\KioskVideochatScreen.test.tsx
```

Fehlschlag korrekt:

- Klick auf "Anna Schmidt anrufen" rief `handleCall` mit `"  user-spaced  "`
  statt `"user-spaced"` auf.

GREEN:

- `normalizeContacts` trimmt `id`, `caregiver_id` und `caregiver_name` vor der
  State-Uebernahme.

## Verifikation

Gruen:

```powershell
npx vitest run components\terminal\video\__tests__\KioskVideochatScreen.test.tsx
npx vitest run components\terminal\video\__tests__\KioskVideochatScreen.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx components\terminal\video\__tests__\KioskContactCard.test.tsx
npx eslint components\terminal\screens\VideochatScreen.tsx components\terminal\video\__tests__\KioskVideochatScreen.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Build-Hinweis:

- `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert` ist erwartetes
  lokales Verhalten.

## Rote Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung. Stripe/Billing bleibt bis
zur GmbH wartend.
