# Auth-Callback Redirect-Regression-Guard

Datum: 2026-05-06 abend

## Ziel

Zweiter lokaler Guard nach dem Open-Redirect-Fix: `/auth/callback` soll nicht
mehr versehentlich zu einem direkten `origin + next` Redirect-Sink
zurueckfallen.

## Pre-Check

- `sanitizeNextPath` existiert bereits in `lib/auth/sanitize-next-path.ts`.
- `/auth/callback` und `/api/test/login` nutzen den Sanitizer schon.
- Es wird deshalb kein zweiter Sanitizer gebaut, sondern ein kleiner Adapter um
  die bestehende Infrastruktur.

## TDD

RED:

```powershell
npx vitest run __tests__/app/auth-callback-redirect.test.ts __tests__/guards/auth-callback-redirect-usage.test.ts
```

Ergebnis: Guard schlug erwartungsgemaess fehl, weil
`app/auth/callback/route.ts` noch keinen zentralen Safe-Redirect-Builder nutzte
und direkt `NextResponse.redirect(`${origin}${next}`)` enthielt.

GREEN:

- `lib/auth/safe-redirect-url.ts` ergaenzt.
- `/auth/callback` nutzt `buildSafeRedirectUrl(origin, next, "/after-login")`.
- Fehler-Redirect nutzt `new URL("/login?error=auth_callback_failed", origin)`.
- Route-Tests pruefen valide In-App-Pfade und unsichere `next`-Vektoren:
  protocol-relative, absolute HTTP(S), `javascript:`, Backslash und fehlender
  fuehrender Slash.

## Grenzen

- Kein Push.
- Kein Deploy.
- Keine Prod-DB.
- Keine Vercel-Env-Aenderung.
- Keine Secrets gelesen oder ausgegeben.

## Verifikation

```powershell
npx vitest run __tests__/app/auth-callback-redirect.test.ts __tests__/guards/auth-callback-redirect-usage.test.ts __tests__/lib/auth/sanitize-next-path.test.ts __tests__/api/test-login.test.ts
# 4 files, 21 tests passed

npx eslint app/auth/callback/route.ts lib/auth/safe-redirect-url.ts lib/auth/sanitize-next-path.ts __tests__/app/auth-callback-redirect.test.ts __tests__/guards/auth-callback-redirect-usage.test.ts __tests__/lib/auth/sanitize-next-path.test.ts __tests__/api/test-login.test.ts
# exit 0

npx tsc --noEmit
# exit 0

git diff --check
# exit 0

npm run build
# exit 0
```
