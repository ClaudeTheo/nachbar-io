// lib/auth/post-login-redirect.ts
// Task B-4: Nach erfolgreichem Login bestimmen, wohin der Nutzer geleitet wird.
// Senioren landen auf dem 4-Kachel-Startscreen (/kreis-start, B-2), alle
// anderen Nutzer auf dem klassischen Dashboard.
//
// Warum eine reine Funktion?
//   - Testbar ohne Supabase-Mocks
//   - Wiederverwendbar in Client-Login (password/OTP) und Server-Callback
//   - Single Source of Truth fuer die Redirect-Regel

import type { UserUiMode } from "@/lib/supabase/types";

export function resolveSafeRedirectPath(
  requestedPath: string | null | undefined,
  fallbackPath: string,
): string {
  if (!requestedPath) return fallbackPath;
  if (!requestedPath.startsWith("/") || requestedPath.startsWith("//")) {
    return fallbackPath;
  }
  return requestedPath;
}

export function resolvePostLoginPath(
  uiMode: UserUiMode | null | undefined,
): "/kreis-start" | "/dashboard" {
  if (uiMode === "senior") {
    return "/kreis-start";
  }
  return "/dashboard";
}
