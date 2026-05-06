# CSP script-src Nonce-Haertung

Datum: 2026-05-06

## Ziel

LOW-Finding F-6 reduzieren: Production-`script-src` soll nicht mehr auf `'unsafe-inline'` angewiesen sein.

## Pre-Check

Codebase-Pre-Check:

```powershell
rg -n "unsafe-inline|Content-Security-Policy|content-security-policy|CSP|script-src|style-src|headers\\(|next-safe|nonce|middleware" -S .
```

Ergebnis:

- CSP war zentral in `next.config.ts` gesetzt.
- Bestehender Test: `__tests__/config/csp-local-supabase.test.ts`.
- `proxy.ts` existiert bereits als Next-16-Proxy.
- `app/layout.tsx` ist bereits `force-dynamic`, daher ist die offizielle Nonce-Variante technisch passend.

## Umsetzung

- Neue zentrale CSP-Hilfe: `lib/security/csp.ts`.
- `next.config.ts` setzt keinen statischen `Content-Security-Policy`-Header mehr, damit keine statische Policy mit der Request-Nonce kollidiert.
- `proxy.ts` erzeugt pro Request eine Nonce, setzt sie als `x-nonce` und `Content-Security-Policy` in die Request-Headers fuer Next-Rendering und setzt dieselbe Policy auf die Response.
- `lib/supabase/middleware.ts` nimmt optionale Request-Headers entgegen, damit `NextResponse.next()` nach Supabase-Cookie-Refresh die Nonce-Headers nicht verliert.

Production-CSP relevant:

```text
script-src 'self' 'nonce-...' 'strict-dynamic'
style-src 'self' 'unsafe-inline'
```

Development bleibt fuer HMR/einfache lokale Arbeit lockerer.

## Wichtiger Zwischenbefund

SRI-only wurde bewusst verworfen: `next build` war gruen, aber ein lokaler Chromium-Smoke zeigte weiterhin CSP-Fehler fuer Next-Inline-Skripte. Danach wurde auf die offizielle Next-Nonce-Variante gewechselt.

Auch `experimental.sri` wurde wieder entfernt: die lokale Reproduktion der GitHub-`E2E Multi-Agent Tests` zeigte geblockte Turbopack-Chunks mit `Failed to find a valid digest in the 'integrity' attribute`. Die Root Cause war SRI/Turbopack-Integrity-Mismatch, nicht die CSP-Nonce. Nonce-CSP bleibt aktiv, SRI bleibt deaktiviert.

`style-src` bleibt bewusst bei `'unsafe-inline'`: ein Chromium-Smoke zeigte sonst zwei blockierte Next/Runtime-Styles. Das urspruengliche LOW-Finding F-6 betrifft `script-src`; Styles koennen spaeter separat mit eigener UI-Smoke-Welle gehärtet werden.

## Verifikation

RED:

```powershell
npx vitest run __tests__/config/csp-local-supabase.test.ts
```

Erster RED: SRI/Production-`script-src` fehlte. Nach SRI-only zeigte Browser-Smoke 5 CSP-Fehler, daher Nonce-Architektur.

GREEN:

```powershell
npx vitest run __tests__/config/csp-local-supabase.test.ts
npx vitest run __tests__/config/csp-local-supabase.test.ts __tests__/middleware/closed-pilot.test.ts __tests__/middleware/legacy-routes.test.ts __tests__/lib/supabase/middleware.test.ts
npx eslint next.config.ts proxy.ts lib/security/csp.ts lib/supabase/middleware.ts __tests__/config/csp-local-supabase.test.ts __tests__/middleware/closed-pilot.test.ts __tests__/middleware/legacy-routes.test.ts __tests__/lib/supabase/middleware.test.ts
npx tsc --noEmit
git diff --check
npm run build
npx playwright test --config=tests/e2e/playwright.config.ts --project=smoke --reporter=list
```

Ergebnis:

- Vitest: 6/6 und 80/80 gruen.
- ESLint: gruen.
- TypeScript: gruen.
- `git diff --check`: gruen, nur CRLF-Warnungen.
- Build: gruen.
- S7-Smoke: 12/12 gruen.

Lokaler Production-Smoke:

```text
STATUS=200
SCRIPT_SRC=script-src 'self' 'nonce-...' 'strict-dynamic'
STYLE_SRC=style-src 'self' 'unsafe-inline'
BROWSER_STATUS=200
BROWSER_TITLE=Nachbar.io — Geschlossener Pilot
BROWSER_CSP_ERRORS=0
BROWSER_INTEGRITY_ERRORS=0
BROWSER_PAGE_ERRORS=0
```

## Keine roten Aktionen

- Kein Push.
- Kein Deploy.
- Keine Prod-DB.
- Keine Migration.
- Keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.
