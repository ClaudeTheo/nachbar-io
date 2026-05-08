# Info-Hub NINA-Date-Trim-Haertung W3bf

Datum: 2026-05-08 abend

## Ziel

Minimaler Date-Trim-Fix im bestehenden Info-Hub-Normalizer. Fokus hier:
`normalizeQuartierInfoResponse` soll valide NINA-`sent_at`-Datumsstrings mit
Rand-Leerzeichen getrimmt weitergeben, statt diese Raender in API/UI/TTS-Pfade
zu tragen.

## Pre-Check

Geprueft:

```powershell
rg -n "Date\.parse\(|new Date\(([^)]*)\)|coerceIsoString|normalize.*Date|sent_at|last_message_at|starts_at|ends_at" lib modules components app __tests__ -g "*.ts" -g "*.tsx"
Get-Content -Path modules\info-hub\normalize-response.ts -TotalCount 120
Get-Content -Path __tests__\modules\info-hub\normalize-response.test.ts -TotalCount 210
```

Ergebnis:

- `normalizeNinaWarnings` ist der bestehende Normalizer fuer
  `normalizeQuartierInfoResponse().nina`.
- `sent_at` wurde als String validiert, aber ungekuerzt weitergegeben.
- Es existiert bereits ein fokussierter Info-Hub-Normalizer-Test.
- Kein neuer Service, keine neue Route und kein neuer Normalizer noetig.

## RED

Ergaenzt in `__tests__/modules/info-hub/normalize-response.test.ts`:

- Eine NINA-Warnung mit `sent_at: "  2026-05-07T16:00:00Z  "` muss mit
  `sent_at: "2026-05-07T16:00:00Z"` normalisiert werden.

RED-Verifikation:

```powershell
npx vitest run __tests__\modules\info-hub\normalize-response.test.ts
```

Erwartet fehlgeschlagen:

- `sent_at` kam mit Rand-Leerzeichen aus dem Normalizer zurueck.

## GREEN

Minimaler Fix:

- `normalizeNinaWarnings` gibt `warning.sent_at.trim()` zurueck.

GREEN-Verifikation:

```powershell
npx vitest run __tests__\modules\info-hub\normalize-response.test.ts
```

Ergebnis:

- gezielter Vitest: 15 Tests gruen.

## Weitere Verifikation

```powershell
npx vitest run __tests__\modules\info-hub\normalize-response.test.ts __tests__\api\quartier-info-route.test.ts __tests__\lib\voice\daily-brief.service.test.ts
npx eslint modules\info-hub\normalize-response.ts __tests__\modules\info-hub\normalize-response.test.ts
git diff --check
npx tsc --noEmit
npm run build
```

Ergebnis:

- gezielter und angrenzender Info-Hub/API/TTS-Vitest: 46 Tests gruen.
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
