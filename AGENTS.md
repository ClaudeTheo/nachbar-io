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
- Current mode: local closed-pilot preparation. Public release, production DB
  work, billing, provider changes, and push-to-main remain gated.

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

## Red Zone

Never do these without explicit Founder-Go in the current session:

- `git push`, especially `git push origin master`.
- `git push --force` / `git push --force-with-lease`, including feature
  branches. A remote branch may already be shared, so force-push can rewrite
  another person's history.
- Vercel production environment changes, unpause, or config changes.
- Production DB writes, migrations, or Supabase project changes.
- Reading, printing, copying, or committing `.env*`, secrets, tokens, or auth
  files.
- Billing, provider account, domain, or secret rotation changes.
- Real pilot-user data processing or AI processing of personal data before
  AVV/DPA clearance and Founder-Go.
- New dependencies or major dependency upgrades in `package.json`; treat them
  as gated because of license, supply-chain, and possible running-cost impact.

## Green Zone

These are allowed without extra Founder-Go unless the current task says
otherwise:

- Local branch switching and local branch creation. End the session back on
  `master`.
- Local commits after verification.
- Vercel deploy dispatches are KI-Hand since 2026-04-30: the workflow is
  dispatch-only, scheduled deploys are removed, closed-pilot mode is active
  (`NEXT_PUBLIC_PILOT_MODE=true`), and no third-party real-user data is live.
  Note: without `git push origin master`, a dispatch can only deploy the old
  remote state, so deploy-without-push is usually not useful.
- Patch dependency updates when they stay within the existing dependency and do
  not introduce new services, licenses, or provider costs.

## Coding Rules

- Before new code or new structure: run a repo pre-check with `rg` and document
  whether matching infrastructure already exists.
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
