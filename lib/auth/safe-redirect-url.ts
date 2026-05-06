// lib/auth/safe-redirect-url.ts
// Zentraler Builder fuer Redirects aus untrusted `next`-Parametern.

import { sanitizeNextPath } from "./sanitize-next-path";

export function buildSafeRedirectUrl(
  origin: string,
  next: string | null | undefined,
  fallback = "/dashboard",
): URL {
  return new URL(sanitizeNextPath(next, fallback), origin);
}
