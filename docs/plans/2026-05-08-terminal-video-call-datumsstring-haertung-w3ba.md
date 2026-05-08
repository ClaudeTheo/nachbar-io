# Terminal VideoCall-Datumsstring-Haertung W3ba

Datum: 2026-05-08 abend

## Ziel

Weitere Terminal-Fetch-Pfade nur mit echtem RED-Test haerten. Fokus hier:
Videosprechstunden-Slots duerfen valide `scheduled_at`-Strings mit
Rand-Leerzeichen nicht als kaputte Termine verwerfen.

## Pre-Check

Geprueft:

```powershell
rg -n "VideoCallScreen|scheduled_at|join_url|status" docs\plans components\terminal\__tests__ components\terminal\screens\VideoCallScreen.tsx
Get-Content -Raw components\terminal\__tests__\TerminalVideoCallScreenGuards.test.tsx
Get-Content -Raw components\terminal\screens\VideoCallScreen.tsx
```

Ergebnis:

- `VideoCallScreen` normalisiert direkte `useConsultations`-Slotwerte lokal.
- Vorherige W3au-Haertung deckte Slot-Status und Join-URL ab.
- `scheduled_at` wurde zwar getrimmt gespeichert, aber vor der Validierung mit
  `new Date(value)` noch nicht getrimmt.
- Echter RED-Kandidat: ein valider Slot mit Rand-Leerzeichen in `scheduled_at`
  wird als `Kein Termin geplant` verworfen.
- Kein neuer Service, keine neue Route und kein neuer Normalizer noetig.

## RED

Ergaenzt in `components/terminal/__tests__/TerminalVideoCallScreenGuards.test.tsx`:

- Ein Slot mit `scheduled_at: "  2026-05-08T11:30:00.000Z  "` muss als Termin
  angezeigt werden.
- Der Screen darf nicht in den Leerzustand `Kein Termin geplant` fallen.
- Es darf kein `Invalid Date`-/`NaN`-Text erscheinen.

RED-Verifikation:

```powershell
npx vitest run components\terminal\__tests__\TerminalVideoCallScreenGuards.test.tsx
```

Erwartet fehlgeschlagen:

- `Videosprechstunde` wurde nicht gefunden.
- Der Screen zeigte `Kein Termin geplant`.

## GREEN

Minimaler Fix:

- `isValidDateString` in `VideoCallScreen` prueft Datumsstrings mit
  `value.trim()`.
- Die bestehende Speicherung von `scheduled_at: slot.scheduled_at.trim()`
  bleibt unveraendert.

GREEN-Verifikation:

```powershell
npx vitest run components\terminal\__tests__\TerminalVideoCallScreenGuards.test.tsx
npx vitest run components\terminal\__tests__\TerminalVideoCallScreenGuards.test.tsx components\terminal\video\__tests__\TerminalCallIntegration.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx eslint components\terminal\screens\VideoCallScreen.tsx components\terminal\__tests__\TerminalVideoCallScreenGuards.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Ergebnis:

- gezielter Vitest: 5 Tests gruen.
- angrenzender Terminal-Vitest: 24 Tests gruen.
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
