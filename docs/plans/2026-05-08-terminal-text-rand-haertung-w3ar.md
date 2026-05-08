# Terminal Text-Rand-Haertung W3ar

Datum: 2026-05-08 abend

## Ziel

Terminal-Statusdaten sollen bei Alert- und News-Titeln keine fuehrenden oder
nachgestellten Leerzeichen in den Client-State uebernehmen.

Zusaetzlich wurde der Videochat-Kontaktnamen-Pfad geprueft. Dort normalisiert
`KioskContactCard` den sichtbaren Namen bereits defensiv, inklusive Trim und
Fallback fuer leere Namen. Deshalb wurde in `VideochatScreen` keine zweite
Namensnormalisierung gebaut.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "title: (alert|item)\.title|caregiver_name: contact\.caregiver_name|normalizeNews|normalizeAlerts|isNonEmptyString|trim\(" lib/terminal components/terminal __tests__/lib/terminal components/terminal/__tests__
```

Ergebnis:

- Bestehende Infrastruktur gefunden:
  - `lib/terminal/useTerminalData.ts`: `normalizeAlerts`, `normalizeNews`,
    `isNonEmptyString`
  - `components/terminal/screens/VideochatScreen.tsx`: `normalizeContacts`
  - `components/terminal/video/KioskContactCard.tsx`: `resolveContactName`
- Kein Neubau. Nur bestehende Normalizer enger angewendet.

## TDD

RED:

```powershell
npx vitest run __tests__\lib\terminal\useTerminalData.test.tsx
```

Fehlschlag korrekt:

- Alert-Titel blieb `"  Hausflur wird gereinigt  "`
- News-Titel blieb `"  Wochenmarkt am Samstag  "`

GREEN:

- `normalizeAlerts` setzt `title: alert.title.trim()`
- `normalizeNews` setzt `title: item.title.trim()`

## Verifikation

Gruen:

```powershell
npx vitest run __tests__\lib\terminal\useTerminalData.test.tsx
npx vitest run components\terminal\video\__tests__\KioskVideochatScreen.test.tsx
npx vitest run components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx vitest run __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx components\terminal\video\__tests__\KioskVideochatScreen.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx eslint lib\terminal\useTerminalData.ts __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\screens\VideochatScreen.tsx components\terminal\video\KioskContactCard.tsx components\terminal\video\__tests__\KioskVideochatScreen.test.tsx
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
