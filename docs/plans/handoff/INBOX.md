# Agent INBOX

Shared task board and mailbox for Codex, Claude, and future coding agents.

## Convention

- Both agents read this file at session start.
- Before multi-file work, add or update a row and set `Status` to
  `in-progress`.
- Commit the status change when taking ownership.
- Set `Status` to `done` after the commit that contains the work.
- The `Files` column acts as the soft lock list.
- If a file is listed for another owner and the task is not `done`, do not edit
  it in parallel unless the Founder explicitly redirects.
- Valid `Status` values: `pending`, `in-progress`, `blocked`, `done`.
- Valid `Owner` values: `claude`, `codex`, `founder`.

## Board

| Status | Owner | Title | Files | Since | Release condition | Last update |
|---|---|---|---|---|---|---|
| done | codex | DSGVO-Wording-Pass + Preview-Routen-Flag | `app/(auth)/register/components/RegisterStepAiConsent.tsx` + `app/(auth)/register/page.tsx` + `app/(auth)/register/preview/[step]/page.tsx` | 2026-04-28 | block-1+2 committed in `b142ace` | 2026-04-28 20:04 |
| pending | claude | Block-3 AI-Stufen-Settings Plan + Implementation | `components/ki-help/*` + `lib/ki-help/*` + `lib/ai/user-settings.ts` + `modules/ai/components/AiHelpSettingsToggle.tsx` + `app/api/settings/ai/route.ts` | 2026-04-28 | may start after reading design doc `a60fc9f` and current INBOX | 2026-04-28 20:04 |

## Notes

- `done` rows are historical and do not hold active locks.
- `pending`, `in-progress`, and `blocked` rows hold locks for the listed files.
- When a task is split, create one row per independently owned write scope.
