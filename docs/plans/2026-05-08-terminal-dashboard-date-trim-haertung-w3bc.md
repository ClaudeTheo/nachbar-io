# Terminal Dashboard-Date-Trim-Haertung W3bc

Datum: 2026-05-08 abend

## Ziel

Minimaler Date-Trim-Fix in einem bestehenden Terminal-Normalizer. Fokus hier:
Das Dashboard darf einen validen `lastCheckin`-Datumsstring mit
Rand-Leerzeichen nicht als fehlenden Check-in behandeln.

## Pre-Check

Geprueft:

```powershell
rg -n "asDashboardDate|lastCheckin|Heute noch nicht geteilt|TerminalPage Dashboard" app\terminal\[token]\page.tsx __tests__\app\terminal\page.test.tsx
Get-Content -LiteralPath app\terminal\[token]\page.tsx -TotalCount 170
Get-Content -Path __tests__\app\terminal\page.test.tsx -TotalCount 170
```

Ergebnis:

- `asDashboardDate` ist bereits der lokale Dashboard-Date-Normalizer.
- Kaputte Datumswerte fallen bereits ruhig auf `Heute noch nicht geteilt`
  zurueck.
- Der Normalizer parste valide ISO-Strings mit Rand-Leerzeichen noch ohne
  vorheriges Trimmen.
- Kein neuer Service, keine neue Route und kein neuer Normalizer noetig.

## RED

Ergaenzt in `__tests__/app/terminal/page.test.tsx`:

- `lastCheckin: "  2026-05-07T08:15:00  "` muss in der Check-in-Kachel als
  `Letztes: 08:15 Uhr` erscheinen.
- Der Fallback `Heute noch nicht geteilt` darf in dieser Kachel nicht sichtbar
  sein.

RED-Verifikation:

```powershell
npx vitest run __tests__\app\terminal\page.test.tsx
```

Erwartet fehlgeschlagen:

- `Letztes: 08:15 Uhr` wurde nicht gefunden.
- Die Kachel zeigte weiterhin `Heute noch nicht geteilt`.

## GREEN

Minimaler Fix:

- `asDashboardDate` trimmt String-Werte vor `new Date(...)`.
- Whitespace-only Strings bleiben ungueltig und fallen weiter auf `null`
  zurueck.

GREEN-Verifikation:

```powershell
npx vitest run __tests__\app\terminal\page.test.tsx
```

Ergebnis:

- gezielter Vitest: 4 Tests gruen.

## Weitere Verifikation

```powershell
npx vitest run __tests__\app\terminal\page.test.tsx components\terminal\__tests__\TerminalHeaderContextGuards.test.tsx components\terminal\__tests__\TerminalNewsScreenGuards.test.tsx
npx eslint app\terminal\[token]\page.tsx __tests__\app\terminal\page.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Ergebnis:

- angrenzender Terminal-Vitest: 9 Tests gruen.
- gezieltes ESLint gruen.
- `git diff --check` gruen; nur erwartete CRLF-Hinweise.
- `npx tsc --noEmit` gruen.
- `npm run build` gruen.

Build-Hinweis:

- `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert` ist das
  erwartete lokale Verhalten.

## Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.

Stripe/Billing bleibt bis zur GmbH wartend.
