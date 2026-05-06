# Cron-Bearer-Helper timing-safe

Datum: 2026-05-06
Owner: Codex
Scope: lokale Qualitaets-/Security-Welle, kein Prod-DB, keine Migration, keine Vercel-Env-Aenderung, kein Deploy.

## Ziel

Direkte `Authorization === Bearer ${CRON_SECRET}`-Vergleiche aus Cron- und internen Security-Routen entfernen und durch einen zentralen timing-safe Helper ersetzen.

## Pre-Check

Ausgefuehrt:

```powershell
rg -n "CRON_SECRET" app lib modules __tests__
rg -n "timingSafeEqual|safeEqual|crypto\\.timing|Bearer" app lib modules __tests__
rg --files app/api | rg "cron|forensic|news/aggregate"
```

Befund:

- Kein bestehender zentraler Cron-Secret-Helper.
- `timingSafeEqual` existierte bereits in `lib/webhooks.ts` fuer HMAC-Webhooks, aber nicht fuer Cron-Bearer.
- Viele Routen in `app/api/cron/**`, `app/api/care/cron/**`, `app/api/news/*`, `app/api/prevention/reminders`, `app/api/security/forensic-ingest` und `lib/security/security-middleware.ts` verglichen direkt gegen `CRON_SECRET`.

## TDD

RED:

```powershell
npx vitest run __tests__/lib/security/cron-secret.test.ts __tests__/guards/cron-secret-usage.test.ts
```

Erwartet fehlgeschlagen:

- `@/lib/security/cron-secret` existierte noch nicht.
- Guard listete direkte Bearer-Stringvergleiche und fehlende Helper-Nutzung.

GREEN:

```powershell
npx vitest run __tests__/lib/security/cron-secret.test.ts __tests__/guards/cron-secret-usage.test.ts
```

Ergebnis: 2 Testdateien, 6 Tests passed.

## Umsetzung

- Neuer Helper `lib/security/cron-secret.ts`
  - `verifyCronSecret(authHeader, expectedSecret?)` fuer `Authorization: Bearer ...`.
  - `verifyCronSecretValue(value, expectedSecret?)` fuer interne Header ohne Bearer, z.B. `x-forensic-secret`.
  - Vergleich via SHA-256-Digest + `timingSafeEqual`, fail-closed bei fehlendem Header oder fehlendem Secret.
- Betroffene Cron-/internen Routen importieren den Helper und behalten ihre bisherigen 500/401/404-Fehlerpfade weitgehend bei.
- Neuer Guard `__tests__/guards/cron-secret-usage.test.ts`
  - schuetzt `app/api/cron/**/route.ts`, `app/api/care/cron/**/route.ts` und die expliziten internen Cron-/Forensik-Routen gegen neue direkte Bearer-/`process.env.CRON_SECRET`-Vergleiche.

## Verifikation

Bisher ausgefuehrt:

```powershell
npx vitest run __tests__/lib/security/cron-secret.test.ts __tests__/guards/cron-secret-usage.test.ts
npx vitest run __tests__/api/cron __tests__/api/care/cron app/api/cron/osm-poi-sync/route.test.ts app/api/cron/ai-test-cleanup-dry-run/route.test.ts app/api/cron/synthetic-smoke/route.test.ts __tests__/lib/security/security-middleware.test.ts
npx eslint "lib/security/cron-secret.ts" "__tests__/lib/security/cron-secret.test.ts" "__tests__/guards/cron-secret-usage.test.ts" "app/api/cron/**/*.ts" "app/api/care/cron/**/*.ts" "app/api/news/aggregate/route.ts" "app/api/news/rss/route.ts" "app/api/news/scrape/route.ts" "app/api/prevention/reminders/route.ts" "app/api/security/forensic-ingest/route.ts" "lib/security/security-middleware.ts"
```

Ergebnis bisher:

- Neue Helper-/Guard-Tests: 6 passed.
- Bestehende Cron-/Security-Middleware-Tests: 19 Testdateien, 163 Tests passed.
- Gezieltes ESLint: gruen.

Noch offen:

```powershell
npx tsc --noEmit
git diff --check
npm run build
```

Endergebnis:

- Neue Helper-/Guard-Tests: 2 Testdateien, 6 Tests passed.
- Bestehende Cron-/Security-Middleware-Tests: 19 Testdateien, 163 Tests passed.
- Gezieltes ESLint: gruen.
- TypeScript: gruen.
- `git diff --check`: gruen.
- Build: gruen.
