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
| done | codex | Lint-Debt Block D: unsafe Function + next rules | `**/*.{ts,tsx}` | 2026-04-30 | block-D done in local commit | 2026-04-30 10:07 |
| done | codex | Lint-Debt Block E: final verification + deploy gate | `.github/workflows/deploy.yml` + `eslint.config.mjs` | 2026-04-30 | block-E done in local commit | 2026-04-30 10:12 |
| done | codex | Block F: it.skip-Tests reaktivieren oder dokumentieren | `__tests__/api/billing-checkout.test.ts` + `__tests__/app/hilfe/tasks/page.test.tsx` + `docs/plans/2026-04-30-skip-tests-handover.md` | 2026-04-30 12:08 +02:00 | block-F committed and verified locally | 2026-04-30 12:13 +02:00 |
| done | codex | Block G: deploy.yml SHA-Vergleichs-Block aufraeumen | `.github/workflows/deploy.yml` + `docs/plans/handoff/INBOX.md` | 2026-04-30 12:13 +02:00 | block-G committed and verified locally | 2026-04-30 12:16 +02:00 |
| done | codex | Block H: E2E-Playwright Datei-Namen-Drift | `playwright.config.ts` + `tests/e2e/playwright.config.ts` + `tests/e2e/README.md` + `docs/plans/handoff/INBOX.md` | 2026-04-30 12:17 +02:00 | block-H committed and verified locally | 2026-04-30 12:24 +02:00 |
| done | codex | Block I: .gitignore fuer Codex-Logs und lokale Reste | `.gitignore` + `docs/plans/handoff/INBOX.md` | 2026-04-30 12:25 +02:00 | block-I committed and status verified | 2026-04-30 12:25 +02:00 |
| done | codex | Untracked-Founder-Hand-Dateien klassifizieren | `docs/plans/2026-04-30-untracked-bestandsaufnahme.md` + `docs/plans/handoff/INBOX.md` | 2026-04-30 12:53 +02:00 | classified for founder decision; no delete, no founder-file staging | 2026-04-30 13:00 +02:00 |
| done | codex | Block 1: Pilot-Feature-Gating-Plan einchecken | `docs/plans/2026-04-30-pilot-feature-gating-plan.md` + `docs/plans/handoff/INBOX.md` | 2026-04-30 13:02 +02:00 | plan spec committed for founder review | 2026-04-30 13:04 +02:00 |
| done | codex | Block 2: Twilio-Rotation als Runbook sichern | `docs/runbooks/twilio-token-rotation.md` + `scripts/rotate-twilio-oneshot.sh` + `docs/plans/handoff/INBOX.md` | 2026-04-30 13:04 +02:00 | redacted runbook committed; untracked one-shot removed locally | 2026-04-30 13:07 +02:00 |
| done | codex | Block 3: Supabase-Legacy-JWT-One-Shot entfernen | `scripts/disable-supabase-legacy-jwts.sh` + `docs/plans/handoff/INBOX.md` | 2026-04-30 13:08 +02:00 | untracked completed one-shot removed locally | 2026-04-30 13:08 +02:00 |
| done | codex | C1: PILOT_MODE-Feature-Flag-Bypass entfernen | `lib/feature-flags-server.ts` + `lib/feature-flags.ts` + `lib/feature-flags-middleware-cache.ts` + `__tests__/lib/feature-flags.test.ts` + `lib/leistungen/__tests__/feature-flag.test.ts` + `lib/__tests__/feature-flags-middleware-cache.test.ts` + `docs/plans/handoff/INBOX.md` | 2026-04-30 14:18 +02:00 | C1 verified locally and ready in commit | 2026-04-30 14:24 +02:00 |
| done | codex | C2: Feature-Flag-Audit-Log + Reason-Feld | `supabase/migrations/176_feature_flags_audit_log.sql` + `supabase/migrations/176_feature_flags_audit_log.down.sql` + `app/(app)/admin/components/FeatureFlagManager.tsx` + `lib/supabase/database.types.ts` + `__tests__/lib/feature-flags-audit-log.test.ts` + `__tests__/components/admin/FeatureFlagManager.test.tsx` + `docs/plans/handoff/INBOX.md` | 2026-04-30 14:25 +02:00 | C2 verified locally; migration file committed but not applied to Prod | 2026-04-30 14:30 +02:00 |
| done | codex | C3: Billing/Twilio/Check-in-Routen per Feature-Flags gaten | `supabase/migrations/177_pilot_phase_flags.sql` + `supabase/migrations/177_pilot_phase_flags.down.sql` + `app/api/billing/**` + `app/api/hilfe/checkout/route.ts` + `app/api/prevention/booking/checkout/route.ts` + `app/api/webhooks/stripe/route.ts` + `app/api/care/checkin/route.ts` + `app/(app)/admin/components/FeatureFlagManager.tsx` + `docs/plans/handoff/INBOX.md` | 2026-04-30 14:31 +02:00 | C3 verified locally; migration file committed but not applied to Prod | 2026-04-30 14:40 +02:00 |
| done | codex | C4: Phase-Preset-API + Admin-UI-Buttons | `lib/feature-flags-presets.ts` + `lib/feature-flags-cache.ts` + `app/api/admin/feature-flags/preset/route.ts` + `app/(app)/admin/components/FeatureFlagManager.tsx` + `__tests__/api/admin/feature-flags-preset.test.ts` + `docs/plans/handoff/INBOX.md` | 2026-04-30 14:41 +02:00 | C4 verified locally and committed; no push/deploy | 2026-04-30 14:46 +02:00 |

## Notes

- `done` rows are historical and do not hold active locks.
- `pending`, `in-progress`, and `blocked` rows hold locks for the listed files.
- When a task is split, create one row per independently owned write scope.
