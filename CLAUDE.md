# Claude Notes

Shared repository rules live in `AGENTS.md`. This file only holds
Claude-specific additions.

## Startup

- Read `AGENTS.md` first.
- Read `docs/plans/handoff/INBOX.md` before starting or resuming work.
- Treat `AGENTS.md` as the cross-agent contract for Codex, Claude, and future
  tools.

## Claude-Specific Working Style

- Use plan/design work for product, scope, compliance, and risk decisions.
- Hand implementation-ready tasks to Codex through `docs/plans/handoff/INBOX.md`
  or a focused `docs/plans/*handover*.md` file.
- Do not duplicate the shared rules from `AGENTS.md` here. If a rule applies to
  every coding agent, update `AGENTS.md` instead.

## Coordination

- Before editing files, check whether another agent owns them in
  `docs/plans/handoff/INBOX.md`.
- When Claude owns a task, update the INBOX row with status, files, release
  condition, and last update.
- When the task is committed, mark it `done` and release the file locks.
