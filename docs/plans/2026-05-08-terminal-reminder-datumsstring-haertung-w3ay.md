# Terminal Reminder-Datumsstring-Haertung W3ay

Datum: 2026-05-08 abend

## Ziel

Weitere Terminal-Fetch-Screens auf echte, testbare Datumsstring-Randfaelle
pruefen. Kein mechanisches Haerten ohne RED-Test.

## Pre-Check

Geprueft:

```powershell
node -e "for (const s of [' 2026-05-07T10:00:00.000Z ','2026-05-07T10:00:00.000Z ']) console.log(JSON.stringify(s), Number.isNaN(new Date(s).getTime()), new Date(s).toString())"
rg -n "id: .*\.id,|scheduled_at: .*scheduled_at,|created_at: .*created_at,|expires_at: .*expires_at,|url: .*\.url," components\terminal app\terminal lib\terminal components\terminal\__tests__
Get-Content -Raw components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
Get-Content -Raw components\terminal\screens\ErinnerungenScreen.tsx
Get-Content -Raw components\terminal\AppointmentPopup.tsx
```

Ergebnis:

- JavaScript behandelt ISO-Datumsstrings mit Rand-Leerzeichen als `Invalid Date`.
- `ErinnerungenScreen` und `AppointmentPopup` haben bereits lokale Normalizer.
- Kein Neubau noetig.
- Echter RED-Kandidat: API-Datumsstrings mit Rand-Leerzeichen werden verworfen.

## RED

Ergaenzt in `components/terminal/__tests__/TerminalReminderArrayGuards.test.tsx`:

- Reminder-Listen akzeptieren `created_at`, `scheduled_at` und `expires_at`
  mit Rand-Leerzeichen.
- Upcoming-Popup akzeptiert `scheduled_at` mit Rand-Leerzeichen.

RED-Verifikation:

```powershell
npx vitest run components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
```

Erwartet fehlgeschlagen:

- Erinnerungen wurden als leer gerendert.
- Upcoming-Popup wurde nicht angezeigt.

## GREEN

Minimaler Fix:

- `isValidDateString` prueft `value.trim()`.
- `created_at`, `scheduled_at` und `expires_at` werden getrimmt in State
  uebernommen.

GREEN-Verifikation:

```powershell
npx vitest run components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
npx vitest run components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx eslint components\terminal\screens\ErinnerungenScreen.tsx components\terminal\AppointmentPopup.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Ergebnis:

- gezielter Vitest: 8 Tests gruen.
- angrenzender Terminal-Vitest: 19 Tests gruen.
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
