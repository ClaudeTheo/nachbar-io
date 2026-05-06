// lib/auth/sanitize-next-path.ts
// Schutz gegen Open-Redirect-Angriffe nach Magic-Link-Auth oder Login.
// Erlaubt nur relative In-App-Pfade. Blockiert:
//   - Protocol-Relative URLs (//evil.com -> Browser folgt zu evil.com)
//   - Backslash-Vektoren (/\evil.com -> alte Browser-Quirks)
//   - Absolute URLs (https://, http://, javascript:, data:)
//   - Strings ohne fuehrenden Slash

const DEFAULT_FALLBACK = "/dashboard";

export function sanitizeNextPath(
  next: string | null | undefined,
  fallback: string = DEFAULT_FALLBACK,
): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  if (next.startsWith("/\\")) return fallback;
  return next;
}
