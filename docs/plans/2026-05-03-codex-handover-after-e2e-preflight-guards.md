# Codex Handover — nach E2E localhost/Supabase-Preflight-Guards

Stand: 2026-05-03 mittag, nach Push von `f786637`.

## Kurzstart fuer neue Session

Arbeite in:

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
```

Zu Beginn lesen:

- `AGENTS.md`
- `docs/plans/handoff/INBOX.md`
- diese Datei
- bei KI-/DSGVO-Themen zusaetzlich:
  - `docs/plans/handoff/2026-05-03-codex-an-claude-ki-dsgvo-plan-review.md`
  - `docs/plans/handoff/2026-05-03-claude-an-codex-push-deploy-vollautonomie.md`

## Echte Git-Lage beim Schreiben

- Branch: `master`
- HEAD: `f786637 test(e2e): guard direct playwright runs`
- `origin/master`: synchron mit `HEAD`
- Lokaler Status: nur untracked `.codex-welle-d-3001.pid`
- `.codex-welle-d-3001.pid` nicht loeschen ohne Founder-Go.

## CI-Stand

GitHub Actions fuer `f786637` sind gruen:

- `Analyze TypeScript/JavaScript`: success
- `Smoke Tests (S7)`: success
- `Multi-Agent Tests (S1-S6)`: success

Actions-Run:

- `https://github.com/ClaudeTheo/nachbar-io/actions/runs/25276186553`

## Was zuletzt erledigt wurde

### Block 1: Ausfuehrbarer localhost/Supabase-Preflight-Guard

Commit: `4c48be0 test(e2e): guard localhost supabase preflight`

Geaendert:

- `scripts/e2e-localhost-preflight.mjs`
- `package.json`
- `__tests__/config/e2e-localhost-preflight.test.ts`
- `__tests__/config/package-scripts.test.ts`
- `tests/e2e/README.md`
- `docs/plans/handoff/INBOX.md`

Ergebnis:

- Lokale `npm run test:e2e*`-Scripts fuehren vor Playwright automatisch
  `node scripts/e2e-localhost-preflight.mjs` aus.
- Der Guard prueft localhost-Ports 3000/3001 und blockiert eindeutig erkannte
  Cloud/Prod-Supabase-Server, z.B. `.env.cloud-current.local`,
  `uylszchlyhbpbmslcnka` oder `supabase.co` in der CommandLine.
- Lokale Supabase-Ziele wie `127.0.0.1:54321` bleiben erlaubt.

Verifikation:

```powershell
npm run e2e:preflight:localhost
npx vitest run __tests__/config/e2e-localhost-preflight.test.ts __tests__/config/package-scripts.test.ts
npx eslint scripts/e2e-localhost-preflight.mjs __tests__/config/e2e-localhost-preflight.test.ts __tests__/config/package-scripts.test.ts --no-warn-ignored
npx tsc --noEmit
git diff --check
```

### Block 2: Direkte Playwright-Aufrufe schuetzen

Commit: `f786637 test(e2e): guard direct playwright runs`

Geaendert:

- `playwright.config.ts`
- `tests/e2e/playwright.config.ts`
- `scripts/e2e-localhost-preflight.mjs`
- `__tests__/config/playwright-config.test.ts`
- `tests/e2e/README.md`
- `docs/plans/handoff/INBOX.md`

Ergebnis:

- Root-Playwright-Konfig und `tests/e2e/playwright.config.ts` nutzen jetzt
  `globalSetup` auf `scripts/e2e-localhost-preflight.mjs`.
- Direkte `npx playwright test`-Aufrufe und direkte
  `npx playwright test --config=tests/e2e/playwright.config.ts`-Aufrufe sind
  dadurch ebenfalls gegen Cloud/local-Supabase-Mischbetrieb abgesichert.
- Das Guard-Script bleibt weiter direkt als CLI nutzbar.

Verifikation:

```powershell
npx vitest run __tests__/config/playwright-config.test.ts __tests__/config/e2e-localhost-preflight.test.ts
npx playwright test --config=tests/e2e/playwright.config.ts --list
npx playwright test --list
npm run e2e:preflight:localhost
npx eslint playwright.config.ts tests/e2e/playwright.config.ts scripts/e2e-localhost-preflight.mjs __tests__/config/playwright-config.test.ts __tests__/config/e2e-localhost-preflight.test.ts --no-warn-ignored
npx tsc --noEmit
git diff --check
```

Hinweis: `--list` laedt die Konfiguration und prueft Syntax/Projektauflistung,
startet aber keine Testausfuehrung. Die Guard-CLI wurde deshalb separat
ausgefuehrt.

## Wichtige Regeln fuer naechste Session

- Vor lokalen Playwright/E2E-Laeufen gegen localhost bleibt die Supabase-Ziel-
  Trennung kritisch: Cloud-Cookie-Key `sb-uylszchlyhbpbmslcnka...` nicht mit
  lokaler `.env.local` / `sb-127-auth-token` mischen.
- Kein Prod-DB-Write, keine Prod-Migration, keine Vercel-Env-Aenderung, keine
  neuen laufenden Kosten und keine echten personenbezogenen Daten ohne AVV.
- `.codex-welle-d-3001.pid` bleibt liegen, bis Thomas explizit Loesch-Go gibt.
- Bei neuem Code: erst Pre-Check per `rg`, bei Verhaltensaenderung TDD strict.

## Naechster sinnvoller Block

Empfohlen: kein weiterer Guard-Block direkt hinterherschieben. Besser einen
kleinen produktnahen, aber sicheren Verifikations- oder Doku-Block waehlen:

1. `docs/plans/2026-05-03-codex-new-session-handover.md` konsolidieren oder
   als veraltet markieren, damit neue Sessions nicht mehr bei `b7a9b62`
   starten.
2. Alternativ einen kleinen lokalen, read-only Browser-Smoke fuer oeffentliche
   Routen nach den E2E-Guard-Aenderungen laufen lassen, ohne Prod-DB/Env-Touch.
3. Deploy nur bewusst entscheiden. Die beiden Guard-Commits sind Test-/Tooling-
   Aenderungen; es gab keinen Deploy-Zwang in dieser Session.

