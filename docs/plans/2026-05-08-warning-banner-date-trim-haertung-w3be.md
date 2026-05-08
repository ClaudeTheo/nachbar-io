# Warning-Banner-Date-Trim-Haertung W3be

Datum: 2026-05-08 abend

## Ziel

Minimaler Date-Trim-Fix in einem bestehenden Warnungs-Normalizer. Fokus hier:
`ExternalWarningBanner` darf einen validen `sent_at`-Datumsstring mit
Rand-Leerzeichen nicht roh anzeigen, sondern soll ihn wie andere valide
Zeitstempel formatiert rendern.

## Pre-Check

Geprueft:

```powershell
rg -n "normalizeWarning|formatSentAt|ExternalWarningBanner|Date\.parse\(|new Date\(value\)|sent_at|sentAt" components\warnings __tests__ app components lib modules -g "*.ts" -g "*.tsx"
Get-Content -Path components\warnings\external-warning-banner.tsx -TotalCount 290
Get-Content -Path components\warnings\__tests__\external-warning-banner.test.tsx -TotalCount 180
```

Ergebnis:

- `normalizeWarning` ist der bestehende Normalizer fuer Banner-Warnungen.
- `sent_at` wurde bislang ungekuerzt als `sentAt` uebernommen.
- `formatSentAt` zeigt bei einem gepaddeten ISO-String den rohen Wert, weil
  `new Date("  ...  ")` ungueltig ist.
- Kein neuer Service, keine neue Route und kein neuer Normalizer noetig.

## RED

Ergaenzt in `components/warnings/__tests__/external-warning-banner.test.tsx`:

- Eine Warnung mit `sent_at: "  2026-04-16T18:00:00.000Z  "` muss als
  `Aktualisiert: 16.04., 20:00` erscheinen.
- Der rohe ISO-String darf nicht sichtbar bleiben.

RED-Verifikation:

```powershell
npx vitest run components\warnings\__tests__\external-warning-banner.test.tsx
```

Erwartet fehlgeschlagen:

- `Aktualisiert: 16.04., 20:00` wurde nicht gefunden.
- Der Banner zeigte `Aktualisiert:   2026-04-16T18:00:00.000Z  `.

## GREEN

Minimaler Fix:

- `normalizeWarning` trimmt `sent_at` vor der Uebernahme in `sentAt`.
- Whitespace-only `sent_at` wird wie fehlender Zeitstempel behandelt.

GREEN-Verifikation:

```powershell
npx vitest run components\warnings\__tests__\external-warning-banner.test.tsx
```

Ergebnis:

- gezielter Vitest: 4 Tests gruen.

## Weitere Verifikation

```powershell
npx vitest run components\warnings\__tests__\external-warning-banner.test.tsx lib\integrations\nina\__tests__\parser.test.ts lib\integrations\dwd\__tests__\parser.test.ts lib\integrations\uba\__tests__\parser.test.ts
npx eslint components\warnings\external-warning-banner.tsx components\warnings\__tests__\external-warning-banner.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Ergebnis:

- gezielter und angrenzender Warnungs-Vitest: 15 Tests gruen.
- gezieltes ESLint gruen.
- `git diff --check` gruen; nur erwartete CRLF-Hinweise.
- `npx tsc --noEmit` gruen.
- `npm run build` gruen.

Build-Hinweis:

- Ein erster Build-Versuch lief in ein Tool-Timeout, hinterliess aber keinen
  `next build`-/Node-Build-Prozess.
- Wiederholung mit laengerem Timeout war gruen.
- `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert` ist das
  erwartete lokale Verhalten.

## Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.

Stripe/Billing bleibt bis zur GmbH wartend.
