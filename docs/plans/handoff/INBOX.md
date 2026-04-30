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
| done | codex | Block-3 AI-Stufen-Settings Plan + Implementation | `components/ki-help/*` + `lib/ki-help/*` + `lib/ai/user-settings.ts` + `modules/ai/components/AiHelpSettingsToggle.tsx` + `app/api/settings/ai/route.ts` | 2026-04-28 | block-3 implemented and verified locally in `69f8b87` | 2026-04-29 |
| done | codex | Phase-4 AI-Level Backend-Differenzierung | `lib/ai/user-settings.ts` + `lib/ai/provider.ts` + `app/api/ai/onboarding/turn/route.ts` + `app/api/ai/onboarding/turn/__tests__/route.test.ts` + `lib/ai/__tests__/provider.test.ts` + `__tests__/lib/ai-user-settings.test.ts` | 2026-04-29 | phase-4 committed and verified locally in `12c3191` | 2026-04-29 15:40 |
| done | codex | Phase-5 Settings-Trigger fuer KI-FAQ-Sheet | `components/ki-help/KiHelpFaqSheet.tsx` + `__tests__/components/ki-help/KiHelpFaqSheet.test.tsx` + `modules/ai/components/AiHelpSettingsToggle.tsx` + `__tests__/components/AiHelpSettingsToggle.test.tsx` | 2026-04-29 | phase-5 committed and verified locally in `0a4b4d1` | 2026-04-29 15:43 |
| done | codex | Lint-Debt Block A: no-explicit-any | `**/*.{ts,tsx}` + `__tests__/_helpers/*` | 2026-04-30 | block-A done in local commit | 2026-04-30 09:33 |
| done | codex | Lint-Debt Block B: react-hooks | `app/**/*.{ts,tsx}` + `components/**/*.{ts,tsx}` + `lib/hooks/**/*.{ts,tsx}` + `modules/**/*.{ts,tsx}` | 2026-04-30 | block-B done in local commit | 2026-04-30 09:48 |
| done | codex | Lint-Debt Block C: no-unused-vars | `**/*.{ts,tsx}` | 2026-04-30 | block-C done in local commit | 2026-04-30 10:00 |

## Notes

- `done` rows are historical and do not hold active locks.
- `pending`, `in-progress`, and `blocked` rows hold locks for the listed files.
- When a task is split, create one row per independently owned write scope.
