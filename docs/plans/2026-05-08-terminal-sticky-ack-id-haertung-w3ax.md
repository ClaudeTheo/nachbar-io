# Terminal Sticky-Ack-ID-Haertung W3ax

Datum: 2026-05-08 abend

## Ziel

Weitere Terminal-Fetch-Screens nur bei echtem RED-Fall haerten. Fokus:
Reminder-/Termin-Listen und Strings, die aus der API in Aktionen zuruecklaufen.

## Pre-Check

Geprueft:

```powershell
git status -sb
rg -n "reminder-ack|acknowledgeSticky|normalizeStickies|normalizeAppointments|upcomingPopup|scheduled_at|created_at|expires_at|\.trim\(\)|reminderId" components\terminal app\api __tests__ components\terminal\__tests__
Get-Content -Raw components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
Get-Content -Raw components\terminal\screens\ErinnerungenScreen.tsx
Get-Content -Raw components\terminal\AppointmentPopup.tsx
```

Ergebnis:

- `ErinnerungenScreen` hat bereits lokale Normalizer.
- Kein Neubau noetig.
- Echter RED-Kandidat: Sticky-ID wird validiert, aber ungetrimmt in State
  uebernommen und beim Abhaken an `/api/device/reminder-ack` gesendet.

## RED

Ergaenzt in `components/terminal/__tests__/TerminalReminderArrayGuards.test.tsx`:

- Ein Sticky mit `id: "  sticky-spaced  "` wird angezeigt.
- Klick auf den Abhaken-Button muss `reminderId: "sticky-spaced"` senden.

RED-Verifikation:

```powershell
npx vitest run components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
```

Erwartet fehlgeschlagen:

- POST-Body enthielt `reminderId: "  sticky-spaced  "`.

## GREEN

Minimaler Fix:

- `normalizeStickies` uebernimmt `id: sticky.id.trim()`.

GREEN-Verifikation:

```powershell
npx vitest run components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
npx vitest run components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx eslint components\terminal\screens\ErinnerungenScreen.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Ergebnis:

- gezielter Vitest: 6 Tests gruen.
- angrenzender Terminal-Vitest: 17 Tests gruen.
- gezieltes ESLint gruen.
- `git diff --check` gruen.
- `npx tsc --noEmit` gruen.
- `npm run build` gruen.

Build-Hinweis:

- `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert` ist das
  erwartete lokale Verhalten.

## Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.

Stripe/Billing bleibt bis zur GmbH wartend.
