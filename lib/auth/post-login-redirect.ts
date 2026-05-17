// lib/auth/post-login-redirect.ts
// Task B-4: Nach erfolgreichem Login bestimmen, wohin der Nutzer geleitet wird.
// Die Generationen-Modi lesen ihr Ziel aus der zentralen Mode-Registry.
//
// Warum eine reine Funktion?
//   - Testbar ohne Supabase-Mocks
//   - Wiederverwendbar in Client-Login (password/OTP) und Server-Callback
//   - Single Source of Truth fuer die Redirect-Regel

import type { UserUiMode } from "@/lib/supabase/types";
import { getUserModeConfig, isUserUiMode, type UserModePostLoginPath } from "@/lib/user-modes";

export function resolvePostLoginPath(
  uiMode: UserUiMode | null | undefined,
  options?: { isAdmin?: boolean | null },
): UserModePostLoginPath {
  if (options?.isAdmin === true) {
    return "/admin";
  }

  if (isUserUiMode(uiMode)) {
    return getUserModeConfig(uiMode).postLoginPath;
  }
  return "/dashboard";
}
