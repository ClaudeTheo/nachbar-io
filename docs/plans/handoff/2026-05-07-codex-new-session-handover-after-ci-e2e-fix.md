# Codex -> neue Session: CSP-Nonce + CI-E2E-Fix lokal fertig

Datum: 2026-05-07

## Sofort zuerst lesen/ausfuehren

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status -sb
git log --oneline origin/master..HEAD
Get-Content docs\plans\handoff\INBOX.md -TotalCount 50
Get-Content docs\plans\handoff\2026-05-07-codex-new-session-handover-after-ci-e2e-fix.md -Raw
```

Wichtig: Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration, keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung ohne explizites Founder-GO von Thomas.

## Aktueller Git-Stand

Repository: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`

Stand beim Schreiben:

```text
## master...origin/master [ahead 4]
3fb9c6d fix(ci): allow local e2e test login through closed pilot
3552dce docs(handoff): save local csp nonce state
c2b5408 fix(security): nonce csp script policy
42d1a7e docs(handoff): claim csp script hardening
```

Diese 4 Commits sind lokal fertig, aber noch nicht gepusht.

Bekannte untracked Alt-Dateien nicht anfassen, solange sie nicht explizit Teil des Auftrags sind:

```text
.codex-welle-d-3001.pid
docs/plans/2026-05-04-quartier-info-skalierung-auto-first.md
docs/plans/handoff/2026-05-03-claude-an-codex-due-diligence-review.md
docs/plans/handoff/2026-05-03-claude-an-codex-founder-go-vollmacht-grosse-schritte.md
docs/plans/handoff/2026-05-03-claude-an-codex-m4-foerderlogik-korrektur.md
docs/plans/handoff/2026-05-03-claude-an-codex-vollgas-bis-100-dann-sicherheit.md
docs/plans/handoff/2026-05-03-codex-an-claude-due-diligence-review.md
docs/plans/handoff/2026-05-04-claude-an-codex-owasp-audit-5-neue-findings.md
docs/plans/handoff/2026-05-04-claude-an-codex-quittung-phase4-findings.md
docs/plans/handoff/2026-05-04-claude-an-codex-security-zweitmeinung.md
docs/plans/handoff/2026-05-04-codex-new-session-handover-security-ci-health-deploy.md
```

## In dieser Session erledigt

### 1. Lokaler Stand bestaetigt

- `AGENTS.md`, `memory/project_session_handover.md`, `docs/plans/handoff/INBOX.md` und die vorherige CSP-Nonce-Uebergabe gelesen.
- `git status -sb` und `git log --oneline origin/master..HEAD` zu Beginn gelesen, wie von Thomas angefordert.
- Kein Push/Deploy/Prod-Gate beruehrt.

### 2. F-6 CSP-Nonce-Stand erneut verifiziert

Bestehender lokaler Commit:

```text
c2b5408 fix(security): nonce csp script policy
```

Frische Verifikation:

```powershell
npx vitest run __tests__/config/csp-local-supabase.test.ts __tests__/middleware/closed-pilot.test.ts __tests__/middleware/legacy-routes.test.ts __tests__/lib/supabase/middleware.test.ts
git diff --check
npx playwright test --config=tests/e2e/playwright.config.ts --project=smoke --reporter=list
npx tsc --noEmit
npx eslint next.config.ts proxy.ts lib/security/csp.ts lib/supabase/middleware.ts __tests__/config/csp-local-supabase.test.ts __tests__/middleware/closed-pilot.test.ts __tests__/middleware/legacy-routes.test.ts __tests__/lib/supabase/middleware.test.ts
npm run build
```

Ergebnisse:

- Vitest CSP/Middleware: 80/80 gruen.
- S7 Smoke: 12/12 gruen.
- TypeScript, ESLint, Build gruen.
- `git diff --check` gruen, nur CRLF-Warnungen in spaeteren Checks.

### 3. CI-E2E Root Cause gefunden und gefixt

Neuer lokaler Commit:

```text
3fb9c6d fix(ci): allow local e2e test login through closed pilot
```

Problem:

- Handoff meldete rote GitHub Action `E2E Multi-Agent Tests` auf Remote-HEAD `a6cbc73`.
- `gh` war nicht eingeloggt, daher keine GitHub-Logs per CLI.
- Lokale CI-nahe Reproduktion mit `CI=true` und `multi-agent + senior-terminal` reproduzierte zuerst 43 Failures.
- Root Cause: `/api/test/login` wurde im Closed-Pilot vor der Route von der Middleware mit `503 closed_pilot` blockiert.
- Nach genauerem Trace: In Next Edge/Middleware sind Test-Secrets nicht immer als Runtime-Env verfuegbar; die Node-Route selbst validiert das Secret aber korrekt. Zudem war die lokale `.env.production.local` mit `VERCEL_ENV=production` nicht GitHub-identisch.

Geaendert:

- `lib/supabase/middleware.ts`
  - `/api/test/login` darf im Closed-Pilot nur bei lokal eingebrannter Supabase (`http://127.0.0.1:*` oder `http://localhost:*`) bis zur Node-Route durch.
  - Vercel `production`/`preview` bleibt blockiert.
  - Cloud-Supabase bleibt blockiert.
  - Wenn die Middleware ein Secret sieht, bleibt der Header-Vergleich timing-safe.
  - Wenn die Edge-Middleware kein Secret sieht, blockiert sie den lokalen Test-Login nicht vorab; die Route validiert danach `E2E_TEST_SECRET`.
- `__tests__/lib/supabase/middleware.test.ts`
  - Regression: Cloud-Supabase bleibt `503`.
  - Regression: lokale Supabase im Production-Start darf bis zur Route.
  - Regression: lokaler Test-Login darf bis zur Route, wenn das Secret nur in der Route verfuegbar ist.
- `docs/plans/handoff/INBOX.md`
  - Neuer Board-Eintrag erledigt.

Verifikation fuer den Fix:

```powershell
npx vitest run __tests__/lib/supabase/middleware.test.ts __tests__/api/test-login.test.ts
npx eslint lib/supabase/middleware.ts __tests__/lib/supabase/middleware.test.ts app/api/test/login/route.ts __tests__/api/test-login.test.ts
npx tsc --noEmit
git diff --check
$env:CI='true'; $env:RESIDENT_HASH_SECRET='ci-test-secret-not-real'; npm run build:local
```

Zusatz-Smokes:

```powershell
# Boundary-Smoke:
# next start mit lokalem Build, VERCEL_ENV leer, POST /api/test/login
# Ergebnis: 503 closed_pilot ist weg; Route wird erreicht.

$env:CI='true'
$env:VERCEL_ENV=''
$env:NEXT_PUBLIC_VERCEL_ENV=''
$env:RESIDENT_HASH_SECRET='ci-test-secret-not-real'
$env:E2E_TEST_SECRET='e2e-test-secret-dev'
npx playwright test --config=tests/e2e/playwright.config.ts --project=auth --reporter=list
npx playwright test --config=tests/e2e/playwright.config.ts --project=multi-agent --project=senior-terminal --reporter=list
```

Ergebnisse:

- Vitest Middleware/Test-Login: 26/26 gruen.
- Gezielt ESLint: gruen.
- TypeScript: gruen.
- `git diff --check`: gruen, nur CRLF-Warnungen.
- `npm run build:local`: gruen.
- Playwright `auth`: 10/10 gruen.
- Playwright CI-nah `multi-agent + senior-terminal`: 95/95 gruen.

Lokale Warnungen im E2E:

- `STRIPE_SECRET_KEY nicht konfiguriert` - lokale Env, erwartet.
- `REDIS_NOT_CONFIGURED` / Security-Scoring fail-open - lokale Env, bekannt.
- Einige Push-/Notification-/Fetch-Warnungen im Testlog; Suite selbst 95/95 gruen.

## Wichtige Nuance fuer naechste Session

Lokal ist `.env.production.local` vorhanden und setzt u.a.:

```text
VERCEL_ENV="production"
NEXT_PUBLIC_SUPABASE_URL="https://uylszchlyhbpbmslcnka.supabase.co\n"
```

Das ist NICHT identisch mit GitHub Actions, wo die lokale Supabase-Env im Workflow gesetzt wird. Fuer lokale CI-nahe Reproduktion:

```powershell
$env:CI='true'
$env:VERCEL_ENV=''
$env:NEXT_PUBLIC_VERCEL_ENV=''
$env:RESIDENT_HASH_SECRET='ci-test-secret-not-real'
$env:E2E_TEST_SECRET='e2e-test-secret-dev'
npm run build:local
npx playwright test --config=tests/e2e/playwright.config.ts --project=multi-agent --project=senior-terminal --reporter=list
```

Nicht mit normalem `npm run build` gegen `.env.production.local` verwechseln, wenn das Ziel GitHub-Action-Reproduktion ist.

## Naechste sinnvolle Schritte

1. Wenn Thomas `GO PUSH` sagt:

```powershell
git push origin master
```

2. Danach GitHub Actions fuer neuen HEAD pruefen:

- CodeQL Security Analysis
- E2E Multi-Agent Tests

3. Wenn E2E auf GitHub noch rot ist:

- Nicht raten.
- `gh auth status` pruefen.
- Falls nicht eingeloggt: Thomas bitten, `gh auth login` auszufuehren.
- Danach Actions-Logs laden und erste echte Failure-Gruppe isolieren.

4. Erst nach erfolgreichem Push + CI und ausdruecklichem Founder-GO Deploy/Prod-Schritte pruefen.

## Nicht nochmal aufrollen

- DNS-Re-Resolve Guard ist erledigt und gepusht.
- Push-Notify Admin-Recipient-Scoping ist erledigt und gepusht.
- F-6 CSP-Script-Nonce ist lokal erledigt und verifiziert.
- SRI ist absichtlich deaktiviert.
- CI-E2E `503 closed_pilot` auf `/api/test/login` ist lokal fixed und CI-nah 95/95 verifiziert.
- Bekannte untracked Alt-Handoffs nicht aufraeumen.
- Kein Deploy wurde gemacht.
- Keine Prod-DB, keine Migration, keine Secrets, keine Billing-/Auth-Aenderung.

## Pilot-Prozent-Einordnung fuer Thomas

Grobe ehrliche Einschaetzung aus dieser Session:

- Code fuer technischen Pilot-Test: ca. 88 Prozent.
- Gesamtpilot mit echten Menschen: ca. 45 Prozent, weil Akquise, Vertraege, GmbH/Konto/AVV und echte Betriebsablaeufe noch offen sind.

Der Code ist lokal deutlich stabiler als zu Session-Beginn; die letzte Sperre ist jetzt organisatorisch/Release-Gate: Push/CI/Deploy nur mit Thomas-GO.
