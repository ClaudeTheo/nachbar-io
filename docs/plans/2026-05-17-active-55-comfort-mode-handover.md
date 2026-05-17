# Active 55 Comfort Mode Handover

Date: 2026-05-17

## Summary

The existing `comfort` UI mode is now the user-facing `Aktiv 55+` mode. It is selectable during registration, persists to `users.ui_mode`, can still be changed from profile, and has a distinct dashboard first action.

## Product Decision

- No new DB role or `ui_mode` value was added.
- Persisted value remains `comfort`.
- User-facing label is `Aktiv 55+`.
- `senior` remains the simplified safety-first mode.

## Changed Files

- `lib/user-modes.ts`
- `__tests__/lib/user-modes.test.ts`
- `__tests__/components/modes/UserModeSurface.test.tsx`
- `app/(auth)/register/components/types.ts`
- `app/(auth)/register/components/RegisterStepUiMode.tsx`
- `app/(auth)/register/components/RegisterStepUiMode.test.tsx`
- `app/(auth)/register/components/index.ts`
- `app/(auth)/register/page.tsx`
- `app/(auth)/register/preview/[step]/page.tsx`
- `app/(auth)/register/preview/RegisterPreviewForm.tsx`
- `app/(auth)/register/components/RegisterStepPilotRole.tsx`
- `app/(auth)/register/components/RegisterStepAiConsent.tsx`
- `app/(auth)/register/components/RegisterStepAiConsent.ui-mode.test.tsx`
- `__tests__/app/register-pilot-role.test.tsx`
- `__tests__/app/register-ai-consent.test.tsx`
- `__tests__/app/register-page-dev-preview.test.tsx`
- `lib/ki-help/register-tour-content.ts`
- `__tests__/lib/ki-help/register-tour-content.test.ts`
- `app/(app)/dashboard/page.tsx`
- `__tests__/app/dashboard-ui-mode.test.tsx`
- `lib/help-content.ts`
- `__tests__/lib/help-content-ui-modes.test.ts`

## Verification

- Targeted Vitest: PASS, 10 files / 58 tests.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- Build warnings: local Stripe payments disabled because `STRIPE_SECRET_KEY` is not configured; build exited `0`.

## Deployment

Not pushed or deployed. Founder GO is still required for push/deploy.
