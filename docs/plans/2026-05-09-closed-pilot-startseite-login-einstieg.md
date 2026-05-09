# Closed-Pilot Startseite Login-Einstieg

Datum: 2026-05-09 vormittag
Owner: Codex

## Anlass

Thomas meldete live auf `https://nachbar-io.vercel.app/`: "hier kann man sich
nicht anmelden".

## Root Cause

`/`, `/login`, `/register` und `/api/health` antworteten live mit 200. Der
Blocker war kein Routing-/Deploy-Ausfall, sondern UX: `app/page.tsx` zeigte im
Closed-Pilot nur Datenschutz, Impressum und AGB. Es gab bewusst keinen
Anmelde-Link auf der Startseite.

Bestehender Test `__tests__/app/closed-pilot-page.test.tsx` erwartete sogar,
dass kein Link mit Name "Anmelden" vorhanden ist.

## Pre-Check

Code-Suche vor der Aenderung:

- `rg "LandingPage|Geschlossener Pilot|/login|/register|app/page|nachbar-io.vercel.app" __tests__ app components docs/plans`

Befund:

- Startseite: `app/page.tsx`
- Login-Seite: `app/(auth)/login/page.tsx`
- bestehender Closed-Pilot-Test: `__tests__/app/closed-pilot-page.test.tsx`

Entscheidung: kein neuer Auth-Flow, nur ein Link von `/` nach `/login`. Die
Registrierung wird auf der Startseite weiter nicht oeffentlich beworben.

## TDD

RED:

```powershell
npx vitest run __tests__/app/closed-pilot-page.test.tsx
```

Fehlschlag: kein zugänglicher Link mit Name `/anmelden/i`.

GREEN:

- Startseite zeigt Button-Link `Anmelden` mit `href="/login"`.
- Hinweistext bleibt geschlossen: "Nur fuer eingeladene Testhaushalte."
- Kein `Registrieren`-Link auf der Startseite.

## Verification

```powershell
npx vitest run __tests__/app/closed-pilot-page.test.tsx __tests__/app/login-page.test.tsx
```

Ergebnis: 2 Testdateien, 4 Tests gruen.

Weitere Checks:

```powershell
git diff --check
npx eslint app/page.tsx __tests__/app/closed-pilot-page.test.tsx
npx tsc --noEmit
npm run build
```

Ergebnis: alle Checks gruen. `npm run build` meldet weiterhin nur die bekannte
Stripe-Deaktivierungsinfo, weil `STRIPE_SECRET_KEY` lokal nicht konfiguriert
ist.

Lokaler Smoke:

```powershell
http://localhost:3000/
```

Ergebnis: 200, `Anmelden` vorhanden, `href="/login"` vorhanden.

## Rote Gates

Nicht beruehrt:

- keine Prod-DB
- keine Migration
- keine Vercel-Env-/Secret-Aenderung
- kein Billing/Provider
- kein Push/Deploy ohne Founder-Go
