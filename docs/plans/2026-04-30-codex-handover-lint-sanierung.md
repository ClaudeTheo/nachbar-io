# Codex Handover: Lint-Sanierung und Deploy-Gate

Datum: 2026-04-30
Projekt: Nachbar.io
Repo: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
Branch: `master`
Status: lokal erledigt, nicht gepusht, kein Deploy

## Was wurde umgesetzt

Codex hat die komplette Lint-Sanierung der echten Nachbar.io-Codebase abgeschlossen und das vorbereitete Deploy-Gate committed.

Abgearbeitete Bloecke:

- Block A: `@typescript-eslint/no-explicit-any`
- Block B.1: `react-hooks/set-state-in-effect`
- Block B.2: `react-hooks/exhaustive-deps`
- Block B.3: `react-hooks/refs`, `purity`, `immutability`, Next-16-Hook-Regeln
- Block C: `@typescript-eslint/no-unused-vars`
- Block D: `@typescript-eslint/no-unsafe-function-type` und `@next/next/no-img-element`
- Block E: finale Verifikation und Workflow-Hardening

## Commits

- `a465d34 docs(handoff): start lint debt block A`
- `9cb8bd8 refactor(types): replace explicit any with proper types or unknown`
- `3511df6 docs(handoff): start lint debt block B`
- `f1a41fa fix(hooks): resolve react-hooks rule violations across app/modules/components`
- `4ceafdd docs(handoff): start lint debt block C`
- `2a5eb8b chore(lint): remove unused vars or prefix with underscore where intended`
- `95af879 docs(handoff): start lint debt block D`
- `0e7f153 fix(types,next): replace unsafe Function types and address next-rule violations`
- `e1adb8f docs(handoff): start lint debt block E`
- `28889cd ci(deploy): make production deploy manual and test-gated`

## Verifikation

Final frisch ausgefuehrt:

- `npx eslint --max-warnings 200`: exit 0
- `npx vitest run`: 495 Test Files passed, 3856 Tests passed, 3 skipped
- `npx tsc --noEmit`: exit 0

Zwischenbefund:

- Ein paralleler ESLint-Lauf mit 120s Timeout wurde nur wegen Timeout abgebrochen; danach solo mit 300s Timeout exit 0.
- Keine Tests wurden geskippt oder deaktiviert.
- Keine Dependencies geaendert.
- Kein `package.json` / Lockfile angefasst.

## Deploy-Gate

Committed in `28889cd`:

- `.github/workflows/deploy.yml`
  - `schedule` entfernt
  - `workflow_dispatch` bleibt einziger Trigger
  - `test` Job ist hart blockierend
  - Lint und Vitest nicht mehr maskiert
  - `deploy` braucht `needs: [check, test]`
  - `npm audit` bleibt warnend
- `eslint.config.mjs`
  - `tests/e2e/**` in `globalIgnores`

## Git-Stand

Tracked Worktree nach Abschluss sauber.

Untracked vorhanden, aber nicht von dieser Sanierung erstellt und nicht angefasst:

- `.codex-*.log`
- `.playwright-cli/`
- diverse alte `docs/plans/2026-04-*.md`
- `output/`
- `scripts/disable-supabase-legacy-jwts.sh`
- `scripts/rotate-twilio-oneshot.sh`

## Nicht gemacht

- Kein Push.
- Kein Vercel-Deploy.
- Keine Prod-DB-Schreibung.
- Keine Migration.
- Keine Secrets gelesen oder geaendert.
- Keine Vercel-Env geaendert.

## Naechste Session

Founder will, dass Claude/Opus in der neuen Session sagt, was Codex als Naechstes machen soll.

Empfohlener Ablauf:

1. Neue Session starten.
2. Erst `firmen-gedaechtnis/06_KI-Zusammenarbeit/Handoff-Codex-an-Opus.md` und diese Datei lesen.
3. Claude/Opus soll naechsten Schritt entscheiden: Review, Push-Freigabe vorbereiten, Deploy-Readiness, oder weiteres Produkt-/Compliance-Gate.
4. Codex pusht weiterhin nicht ohne ausdrueckliches Founder-Go.
