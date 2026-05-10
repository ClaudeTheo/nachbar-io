// lib/security/founder-bypass.ts
// Founder-Bypass fuer Risk-Scorer / Trap-Middleware.
//
// Hintergrund: Die App-Security-Middleware sammelt Trap-Hits und sperrt IPs/Sessions
// bei effectiveScore >= Stage-3-Threshold mit 403 "Zugriff voruebergehend gesperrt".
// TTL ist 4h. Founder muessen testen koennen, ohne sich selbst auszusperren.
//
// Sicherheit: Wir lesen die user_id aus dem Supabase-Auth-Cookie via Base64-Decode
// (KEINE Signatur-Verifikation — die laeuft sowieso in den eigentlichen Routes).
// Bypass spart NUR den Risk-Score-Check; Auth selbst ist unbeeinflusst.
// Ein gefaelschter JWT mit Founder-sub kommt durch unsere Schicht durch, scheitert
// aber an der naechsten Auth-Pruefung mit 401.

import type { NextRequest } from "next/server";

// Founder/Initial-Admin User-IDs (Production). Bei Personal-Wechsel hier ergaenzen.
const FOUNDER_USER_IDS: ReadonlyArray<string> = [
  "dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd", // Thomas Theobald (founder)
];

// Supabase Auth-Cookie-Name: sb-<project-ref>-auth-token
// Project-Ref aus NEXT_PUBLIC_SUPABASE_URL ableiten (z.B. https://uylszchlyhbpbmslcnka.supabase.co)
function deriveAuthCookieName(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const match = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  const projectRef = match?.[1] ?? "";
  return projectRef ? `sb-${projectRef}-auth-token` : "";
}

/**
 * Edge-safe Base64-URL-Decode.
 * atob() kann Standard-Base64, JWT nutzt URL-safe (- _) ohne Padding.
 */
function decodeBase64Url(input: string): string | null {
  try {
    const padded =
      input.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (input.length % 4)) % 4);
    return atob(padded);
  } catch {
    return null;
  }
}

/**
 * Liest user_id (sub) aus Supabase-Auth-Cookie ohne Signatur-Verifikation.
 * Returns null wenn kein Cookie / kein gueltiges JWT-Format.
 */
export function readUserIdFromCookie(request: NextRequest): string | null {
  const cookieName = deriveAuthCookieName();
  if (!cookieName) return null;

  // Supabase teilt das Cookie ggf. in Chunks `<name>.0`, `<name>.1` ...
  const direct = request.cookies.get(cookieName)?.value;
  let raw: string | undefined = direct;
  if (!raw) {
    const chunks: string[] = [];
    for (let i = 0; i < 10; i++) {
      const chunk = request.cookies.get(`${cookieName}.${i}`)?.value;
      if (!chunk) break;
      chunks.push(chunk);
    }
    if (chunks.length > 0) raw = chunks.join("");
  }
  if (!raw) return null;

  // Supabase prefixt seit Anfang 2025 ein "base64-" — strippen
  if (raw.startsWith("base64-")) {
    const decoded = decodeBase64Url(raw.slice("base64-".length));
    if (!decoded) return null;
    raw = decoded;
  }

  // Cookie-Inhalt ist URL-encoded JSON (Array oder Object)
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeURIComponent(raw));
  } catch {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  let accessToken: string | undefined;
  if (Array.isArray(parsed)) {
    if (typeof parsed[0] === "string") accessToken = parsed[0];
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as { access_token?: unknown; currentSession?: unknown };
    if (typeof obj.access_token === "string") {
      accessToken = obj.access_token;
    } else if (
      obj.currentSession &&
      typeof obj.currentSession === "object" &&
      typeof (obj.currentSession as { access_token?: unknown }).access_token ===
        "string"
    ) {
      accessToken = (obj.currentSession as { access_token: string })
        .access_token;
    }
  }
  if (!accessToken) return null;

  const parts = accessToken.split(".");
  if (parts.length !== 3) return null;
  const payloadJson = decodeBase64Url(parts[1]);
  if (!payloadJson) return null;

  try {
    const payload = JSON.parse(payloadJson) as { sub?: unknown };
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Prueft ob der Request von einem Founder kommt (Bypass fuer Risk-Scorer).
 * Edge-safe (keine DB-Calls, kein crypto).
 */
export function isFounderRequest(request: NextRequest): boolean {
  const userId = readUserIdFromCookie(request);
  if (!userId) return false;
  return FOUNDER_USER_IDS.includes(userId);
}
