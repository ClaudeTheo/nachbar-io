// lib/security/client-key.ts
// IP-Hash (DSGVO), Session-Hash, Key-Generierung
// IP wird mit taeglichem Salt gehasht → nicht rueckverfolgbar

import { createHash } from "crypto";

// Taeglicher Salt: Rotiert um Mitternacht UTC
function getDailySalt(): string {
  return new Date().toISOString().slice(0, 10); // "2026-04-06"
}

export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(ip + getDailySalt())
    .digest("hex")
    .slice(0, 16); // 16 Zeichen reichen fuer Eindeutigkeit
}

export function hashSession(sessionToken: string): string {
  // Nur Praefix hashen (nicht den ganzen Token)
  const prefix = sessionToken.slice(0, 32);
  return createHash("sha256").update(prefix).digest("hex").slice(0, 16);
}

export function hashUserAgent(ua: string): string {
  return createHash("sha256").update(ua).digest("hex").slice(0, 16);
}

export interface ClientKeys {
  ipHash: string;
  userId: string | null;
  sessionHash: string | null;
}

export function buildClientKeys(request: {
  headers: { get(name: string): string | null };
  ip?: string | null;
  cookies?: { get(name: string): { value: string } | undefined };
}): ClientKeys {
  // IP extrahieren (gleiche Logik wie rate-limit.ts)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0].trim() || realIp || request.ip || "unknown";

  // Session-Token aus Cookie (Supabase Auth)
  const sessionCookie = request.cookies?.get("sb-access-token")?.value
    || request.headers.get("authorization")?.replace("Bearer ", "");

  return {
    ipHash: hashIp(ip),
    userId: null, // Wird spaeter aus Auth-Context befuellt (nicht in Middleware verfuegbar)
    sessionHash: sessionCookie ? hashSession(sessionCookie) : null,
  };
}
