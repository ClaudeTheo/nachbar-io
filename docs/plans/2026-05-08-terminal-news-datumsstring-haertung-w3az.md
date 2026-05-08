# Terminal News-Datumsstring-Haertung W3az

Datum: 2026-05-08 abend

## Ziel

Weitere Terminal-Fetch-Pfade nur bei echtem RED-Test haerten. Fokus hier:
Quartiersnachrichten duerfen valide API-Datumsstrings mit Rand-Leerzeichen nicht
als kaputt verwerfen.

## Pre-Check

Geprueft:

```powershell
rg -n "fetch\(|\.json\(|new Date\(|Date\.parse|publishedAt|createdAt|lastCheckin|nextAppointment|normalizeNews|normalizeAlerts" components\terminal app lib\terminal -g "*.ts" -g "*.tsx"
Get-Content -Raw lib\terminal\useTerminalData.ts
Get-Content -Raw components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx
```

Ergebnis:

- `NewsScreen` nutzt den bestehenden `normalizeNews`-Pfad aus
  `lib/terminal/useTerminalData.ts`.
- JavaScript behandelt ISO-Datumsstrings mit Rand-Leerzeichen als ungueltig.
- Echter RED-Kandidat: `publishedAt` mit Rand-Leerzeichen wird verworfen,
  obwohl die API fachlich ein valides Datum liefert.
- Kein neuer Service, keine neue Route und kein neuer Normalizer noetig.

## RED

Ergaenzt in `components/terminal/__tests__/TerminalNewsScreenGuards.test.tsx`:

- Eine News mit `publishedAt: "  2026-05-07T09:00:00.000Z  "` muss weiterhin
  angezeigt werden.
- Die Anzeige darf keinen `Invalid Date`-/`NaN`-Text rendern.

RED-Verifikation:

```powershell
npx vitest run components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx
```

Erwartet fehlgeschlagen:

- `Quartierstreff am Freitag` wurde nicht gefunden.
- Der Screen zeigte stattdessen den Leerzustand `Keine Neuigkeiten`.

## GREEN

Minimaler Fix im bestehenden `useTerminalData`-Normalizer:

- `isValidDateString` prueft Datumsstrings mit `value.trim()`.
- `asNullableDateString` gibt getrimmte Datumsstrings zurueck.
- `normalizeNews` speichert `id` und `publishedAt` getrimmt.
- `normalizeAlerts` speichert `id` und `createdAt` getrimmt, weil derselbe
  Datums-Helfer dort genutzt wird.

GREEN-Verifikation:

```powershell
npx vitest run components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx
npx vitest run components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx components\terminal\__tests__\TerminalHeaderContextGuards.test.tsx
npx eslint lib\terminal\useTerminalData.ts components\terminal\screens\NewsScreen.tsx components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Ergebnis:

- gezielter Vitest: 3 Tests gruen.
- angrenzender Terminal-Vitest: 11 Tests gruen.
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
