# Terminal VideoCall-Slot-Status-Haertung W3au

Datum: 2026-05-08 abend

## Ziel

`VideoCallScreen` soll valide Videosprechstunden-Slots nicht verwerfen, wenn
API-Stringfelder Rand-Leerzeichen enthalten. Relevant war vor allem `status`,
weil `"  waiting  "` vor der Haertung nicht als wartender Termin erkannt wurde.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "function normalize|function as|isNonEmptyString|return \[\{|\.trim\(|TODO|Kaputt|Fallback|unknown|unknown\)" components/terminal lib/terminal app/terminal __tests__/lib/terminal components/terminal/__tests__
rg -n "fetch\(" components/terminal app/terminal lib/terminal
```

Ergebnis:

- Bestehende Infrastruktur gefunden:
  - `components/terminal/screens/VideoCallScreen.tsx`: `normalizeVideoCallSlots`,
    `normalizeText`, `normalizeJoinUrl`
  - `components/terminal/__tests__/TerminalVideoCallScreenGuards.test.tsx`
- Kein Neubau. Bestehende Slot-Normalisierung erweitert.

## TDD

RED:

```powershell
npx vitest run components\terminal\__tests__\TerminalVideoCallScreenGuards.test.tsx
```

Fehlschlag korrekt:

- Ein Slot mit `status: "  waiting  "` wurde als kaputt gefiltert und als
  "Kein Termin geplant" gerendert.

GREEN:

- `normalizeVideoCallSlots` trimmt `status` vor dem Status-Set-Check.
- `id` und `scheduled_at` werden beim Uebernehmen getrimmt.
- `normalizeJoinUrl` parst und speichert die getrimmte URL.

## Verifikation

Gruen:

```powershell
npx vitest run components\terminal\__tests__\TerminalVideoCallScreenGuards.test.tsx
npx vitest run components\terminal\__tests__\TerminalVideoCallScreenGuards.test.tsx components\terminal\video\__tests__\TerminalCallIntegration.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx eslint components\terminal\screens\VideoCallScreen.tsx components\terminal\__tests__\TerminalVideoCallScreenGuards.test.tsx
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
