# Nachbar.io Agent Rules

Shared repository guidance for Codex, Claude, and future coding agents.
Tool-specific notes belong in `CLAUDE.md` or the agent runtime. This file is
the cross-agent baseline.

## Repository

- Project: Nachbar.io / QuartierApp.
- Stack: Next.js App Router, React, TypeScript, Tailwind, Supabase, Vitest,
  Playwright, ESLint.
- Branch model: local work happens directly on `master` unless the Founder
  explicitly asks for a branch or worktree.
- Current mode: closed-pilot preparation with Codex push/deploy autonomy since
  Founder-Update 2026-05-03 abend. Production DB work, billing/provider live
  switches, Vercel env changes, and real personal-data AI processing remain
  gated.

## Coordination

- Read `docs/plans/handoff/INBOX.md` at session start.
- Shared rule files live in the parent workspace, not inside this repo:
  from `nachbar-io/`, use `../.claude/rules/{pre-check,testing,db-migrations}.md`.
- The `Files` column in `INBOX.md` acts as the current soft lock list.
- Do not edit files listed for another active owner unless the owner has marked
  the task `done`, released the lock, or the Founder explicitly redirects.
- Add or update task rows before starting multi-file work.
- Mark work `done` after the local commit that contains it.

## Commands

Use the smallest relevant verification set first, then broaden when risk grows.

```bash
npx vitest run <test files>
npx tsc --noEmit
npx eslint <touched files>
npm run build
```

Existing package scripts:

```bash
npm run dev
npm run test
npm run lint
npm run build
npm run test:e2e
npm run test:e2e:pilot
```

Before local Playwright/E2E runs against `localhost`, verify the server target
instead of trusting Playwright's `reuseExistingServer`:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess
Get-CimInstance Win32_Process -Filter "ProcessId=<PID>" |
  Select-Object ProcessId,CommandLine
```

If a reused `localhost:3000` server was started with Cloud/Prod Supabase
(`sb-uylszchlyhbpbmslcnka...` cookie key) while the Playwright process loads
local `.env.local` (`127.0.0.1:54321`, `sb-127-auth-token`), stop or avoid that
server before testing. For local Supabase E2E, prefer a fresh `npm run dev` on
3000 or the explicit `build:local`/`start:local` path on 3001. Do not mix Cloud
server state with local Supabase auth state.

## Red Zone

Never do these without explicit Founder-Go in the current session:

- Production DB writes, migrations, `apply_migration`, or
  `execute_sql INSERT/UPDATE/DELETE`.
- Supabase project changes beyond read-only verification.
- Vercel production environment changes, unpause, config changes, or any
  secret/new/deleted/changed variable.
- Reading, printing, copying, or committing `.env*`, secrets, tokens, or auth
  files.
- Billing, provider account, domain, or secret rotation changes.
- Stripe/Billing live setup waits until the GmbH is registered; keep payments
  locally disabled until the Founder explicitly reopens this.
- Provider live switches (KI, Stripe, Twilio, etc.) without AVV/DPA clearance.
- New running costs.
- Real pilot-user data processing or AI processing of personal data before
  AVV/DPA clearance and Founder-Go.
- New dependencies or major dependency upgrades in `package.json`; treat them
  as gated because of license, supply-chain, and possible running-cost impact.
- Deleting local leftovers/logs/Founder-hand files unless explicitly asked.

## Auto-Stop Triggers

Codex stops itself and returns to push-go-per-wave if any of these are true:

- Prod `users` has entries with `is_test_user IS NOT TRUE` > 0, meaning real
  pilot families have onboarded.
- The code to push/deploy assumes migrations that are not applied on Prod.
- A deploy would make new provider calls live without AVV/DPA clearance.
- `NEXT_PUBLIC_PILOT_MODE` would be `false`.

If an auto-stop trigger fires, explain the risk briefly and propose the safe
next step.

## Green Zone

These are allowed without extra Founder-Go unless the current task says
otherwise:

- Local branch switching and local branch creation. End the session back on
  `master`.
- Local commits after verification.
- `git push origin master` after local verification.
- `git push --force-with-lease` after local verification and only when it will
  not rewrite another person's work.
- `gh workflow run deploy.yml` when deploying the pushed state is intended.
- `vercel deploy --prod` without `--prebuilt` when a Vercel/Linux remote build
  is the safer path.
- Production rollback via Vercel UI when a deployment is bad.
- Patch dependency updates when they stay within the existing dependency and do
  not introduce new services, licenses, or provider costs.

Before push: run the relevant local verification stack (Vitest, ESLint, tsc,
and build when the change can affect build/runtime). Before deploy: confirm the
exact commit is intended to go live and add/update the INBOX audit trail.

Do not use Windows `vercel build --prod` + `vercel deploy --prebuilt --prod`
for Production; use GitHub Actions/Linux or `vercel deploy --prod` without
`--prebuilt`.

## Coding Rules

- Before new code or new structure: run a repo pre-check with `rg` and document
  whether matching infrastructure already exists.
- **Security mini-audit before any wave touching auth/RLS/admin surface.**
  Triggers: new migration with user-writable rights, new admin route, RLS policy
  change, new auth/token path, new `users.settings` key, role/permission check.
  Run the 5-minute checklist from `../.claude/rules/security-mini-audit.md`:
  RLS read-pass + trigger inventory + privilege-column sweep + audit-trail check
  + rate-limit check. STOP on CRITICAL/HIGH and report to founder.
  Lesson Pass 63 (2026-05-15): 1 CRITICAL + 3 HIGH findings sat between
  Phase-5 audit (2026-05-04) and Pass 63 undetected; ADM-3 dormant since Mig 001.
- TDD is required for behavioral changes: RED, GREEN, then refactor.
- Keep MVP scope small. Avoid duplicate abstractions and migrations unless the
  codebase proves they are needed.
- Prefer existing local patterns, components, services, and tests.
- Do not clean unrelated logs, `output/`, `.playwright-cli/`, or old untracked
  files unless explicitly asked.
- Do not revert or overwrite work from another agent or the Founder.

## Memory And Docs

- Shared company memory:
  `C:\Users\thoma\Documents\New project\firmen-gedaechtnis`.
- Repo-local Claude memory:
  `C:\Users\thoma\.claude\projects\C--Users-thoma-Claud-Code-Handy-APP\memory`.
- Current cross-agent mailbox:
  `docs/plans/handoff/INBOX.md`.
- Claude-specific repo notes:
  `CLAUDE.md`.

When instructions conflict, follow the newest explicit Founder instruction.
If code and a plan disagree, the current code is authoritative.
