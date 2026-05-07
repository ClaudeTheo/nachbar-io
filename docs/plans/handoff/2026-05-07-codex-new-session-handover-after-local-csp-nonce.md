# Codex -> neue Session: lokaler CSP-Nonce-Stand

Datum: 2026-05-07

## Sofort zuerst lesen/ausfuehren

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status -sb
git log --oneline origin/master..HEAD
Get-Content docs\plans\handoff\INBOX.md -TotalCount 50
Get-Content docs\plans\handoff\2026-05-07-codex-new-session-handover-after-local-csp-nonce.md -Raw
```

Wichtig: Kein Push, Deploy, Prod-DB-Schreiben, Prod-Migrationen, Vercel-Env/Secret/Billing/Auth-Aenderungen ohne explizites Founder-GO von Thomas.

## Aktueller Git-Stand

Repository: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`

Stand beim Schreiben:

```text
## master...origin/master [ahead 2]
c2b5408 fix(security): nonce csp script policy
42d1a7e docs(handoff): claim csp script hardening
```

Diese 2 Commits sind lokal fertig, aber noch nicht gepusht.

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

## In dieser Session zuletzt erledigt

### F-6 CSP `script-src unsafe-inline` reduziert

Lokaler Commit:

```text
c2b5408 fix(security): nonce csp script policy
```

Softlock-Commit:

```text
42d1a7e docs(handoff): claim csp script hardening
```

Geaendert:

- `lib/security/csp.ts`
- `proxy.ts`
- `lib/supabase/middleware.ts`
- `next.config.ts`
- `__tests__/config/csp-local-supabase.test.ts`
- `docs/plans/2026-05-06-csp-script-src-sri-hardening.md`
- `docs/plans/handoff/INBOX.md`

Ergebnis:

- Statischer `Content-Security-Policy`-Header wurde aus `next.config.ts` entfernt, damit er nicht mit Request-Nonce kollidiert.
- `proxy.ts` erzeugt pro Request eine Nonce, setzt `x-nonce` und eine CSP in die Request-Headers fuer Next-Rendering und dieselbe CSP auf die Response.
- `lib/supabase/middleware.ts` nimmt optionale Request-Headers an, damit Supabase-Cookie-Refresh die Nonce-Headers nicht verliert.
- Production-`script-src` ist jetzt:

```text
script-src 'self' 'nonce-...' 'strict-dynamic'
```

- `style-src` bleibt bewusst:

```text
style-src 'self' 'unsafe-inline'
```

Grund: Chromium-Smoke zeigte bei `style-src` mit Nonce zwei blockierte Next/Runtime-Styles. Das bearbeitete F-6-Finding betrifft `script-src`; Style-Haertung ist ein eigener spaeterer Block.

Wichtig: `experimental.sri` wurde bewusst NICHT behalten. SRI-only baute zwar, aber:

- Browser-Smoke zeigte bei SRI-only weiterhin blockierte Next-Inline-Skripte.
- Lokale Reproduktion der GitHub-`E2E Multi-Agent Tests` zeigte danach Turbopack-Chunk-Blocker:
  `Failed to find a valid digest in the 'integrity' attribute`.
- Root Cause: SRI/Turbopack-Integrity-Mismatch. Deshalb SRI wieder entfernt, Nonce-CSP behalten.

## Verifikation fuer lokalen CSP-Block

Gruen:

```powershell
npx vitest run __tests__/config/csp-local-supabase.test.ts __tests__/middleware/closed-pilot.test.ts __tests__/middleware/legacy-routes.test.ts __tests__/lib/supabase/middleware.test.ts
npx eslint next.config.ts proxy.ts lib/security/csp.ts lib/supabase/middleware.ts __tests__/config/csp-local-supabase.test.ts __tests__/middleware/closed-pilot.test.ts __tests__/middleware/legacy-routes.test.ts __tests__/lib/supabase/middleware.test.ts
npx tsc --noEmit
git diff --check
npm run build
npx playwright test --config=tests/e2e/playwright.config.ts --project=smoke --reporter=list
```

Ergebnisse:

- Vitest: 80/80 gruen.
- ESLint: gruen.
- TypeScript: gruen.
- `git diff --check`: gruen, nur CRLF-Warnungen.
- Build: gruen.
- S7-Smoke: 12/12 gruen.
- Manueller Chromium-Smoke:

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

## Remote-CI vom letzten Push

Letzter gepushter Remote-HEAD war `a6cbc73 docs(handoff): save post push f7 local state`.

GitHub Actions Stand beim Schreiben:

- `a6cbc73` CodeQL Security Analysis: `completed / success`
- `a6cbc73` E2E Multi-Agent Tests: `completed / failure`

Links:

- CodeQL: https://github.com/ClaudeTheo/nachbar-io/actions/runs/25458673409
- E2E: https://github.com/ClaudeTheo/nachbar-io/actions/runs/25458673343

Die GitHub-Joblogs waren ohne `gh auth` nicht lesbar. Lokal wurde die CI-Kombi `multi-agent + senior-terminal` reproduziert; sie zeigte viele Fehler, aber ein klarer technischer Root-Cause aus dem CSP-Experiment war SRI/Turbopack-Integrity-Mismatch. Dieser Teil ist im lokalen Commit `c2b5408` bereits behoben.

## Naechste sinnvolle Schritte

1. Stand bestaetigen:

```powershell
git status -sb
git log --oneline origin/master..HEAD
```

2. Optional vor Push noch einmal kurz lokal pruefen:

```powershell
npx vitest run __tests__/config/csp-local-supabase.test.ts __tests__/middleware/closed-pilot.test.ts __tests__/middleware/legacy-routes.test.ts __tests__/lib/supabase/middleware.test.ts
npx playwright test --config=tests/e2e/playwright.config.ts --project=smoke --reporter=list
```

3. Wenn Thomas explizit `GO PUSH` sagt: die zwei lokalen Commits pushen.

```powershell
git push origin master
```

4. Nach Push GitHub Actions pruefen. CodeQL und E2E muessen neu fuer `c2b5408` laufen.

5. Wenn E2E weiterhin rot bleibt: nicht raten. `gh auth status` pruefen; wenn GitHub-Login moeglich ist, Joblogs herunterladen. Sonst lokal mit `CI=true` reproduzieren und die erste echte Failure-Gruppe isolieren.

## Nicht nochmal aufrollen

- DNS-Re-Resolve Guard ist erledigt und gepusht.
- Push-Notify Admin-Recipient-Scoping ist erledigt und gepusht.
- F-6 CSP-Script-Nonce ist lokal erledigt und verifiziert.
- SRI ist absichtlich deaktiviert.
- Bekannte untracked Alt-Handoffs nicht aufraeumen.
- Kein Deploy wurde gemacht.
- Keine Prod-DB, keine Migration, keine Secrets, keine Billing-/Auth-Aenderung.

