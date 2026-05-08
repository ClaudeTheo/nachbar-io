# Terminal Foto-Datumsstring-Haertung W3bb

Datum: 2026-05-08 abend

## Ziel

Weitere Terminal-Fetch-Pfade nur mit echtem RED-Test haerten. Fokus hier:
Familienfotos duerfen valide `createdAt`-Strings mit Rand-Leerzeichen nicht als
kaputte Foto-Eintraege verwerfen.

## Pre-Check

Geprueft:

```powershell
rg -n "FamilienFotosScreen|createdAt|photo\.createdAt|normalizePhotos|photo-spaced|kaputtes-datum" components\terminal docs\plans\handoff\INBOX.md docs\plans -g "*.tsx" -g "*.md"
Get-Content -Raw components\terminal\screens\FamilienFotosScreen.tsx
Get-Content -Raw components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
```

Ergebnis:

- Foto-Listen-Shape, Caption und URL-Raender sind bereits abgedeckt.
- `FamilienFotosScreen` validierte `createdAt` noch mit `new Date(value)` ohne
  vorheriges Trimmen.
- Echter RED-Kandidat: Ein valides Foto mit Rand-Leerzeichen in `createdAt`
  faellt in den Leerzustand `Noch keine Fotos vorhanden`.
- Kein neuer Service, keine neue Route und kein neuer Normalizer noetig.

## RED

Ergaenzt in `components/terminal/__tests__/TerminalDeviceListGuards.test.tsx`:

- Ein Foto mit `createdAt: "  2026-05-07T08:00:00.000Z  "` muss angezeigt
  werden.
- Der Screen darf nicht in den Leerzustand `Noch keine Fotos vorhanden` fallen.

RED-Verifikation:

```powershell
npx vitest run components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
```

Erwartet fehlgeschlagen:

- `img` mit Name `Familienfoto` wurde nicht gefunden.
- Der Screen zeigte `Noch keine Fotos vorhanden`.

## GREEN

Minimaler Fix:

- `isValidDateString` in `FamilienFotosScreen` prueft Datumsstrings mit
  `value.trim()`.
- `id` und `createdAt` werden getrimmt in den Foto-State uebernommen.

GREEN-Verifikation:

```powershell
npx vitest run components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx vitest run components\terminal\__tests__\TerminalDeviceListGuards.test.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx
npx eslint components\terminal\screens\FamilienFotosScreen.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Ergebnis:

- gezielter Vitest: 12 Tests gruen.
- angrenzender Terminal-Vitest: 23 Tests gruen.
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
