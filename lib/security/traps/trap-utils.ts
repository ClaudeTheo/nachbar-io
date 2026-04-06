// lib/security/traps/trap-utils.ts
// Hilfsfunktionen fuer Trap-Integration in API-Routes (Node.js Runtime)
// Baut ClientKeys aus NextRequest ohne Edge-Crypto-Abhaengigkeit

import { createHash } from "crypto";
import type { ClientKeys } from "../client-key";
import type { NextRequest } from "next/server";

// Taeglicher Salt (gleiche Logik wie client-key.ts)
function getDailySalt(): string {
  return new Date().toISOString().slice(0, 10);
}

function hashIpNode(ip: string): string {
  return createHash("sha256")
    .update(ip + getDailySalt())
    .digest("hex")
    .slice(0, 16);
}

/** Baut ClientKeys aus einem API-Route-Request (Node.js Runtime) */
export function buildClientKeysNode(
  request: NextRequest,
  userId?: string | null,
): ClientKeys {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0].trim() || realIp || "unknown";

  return {
    ipHash: hashIpNode(ip),
    userId: userId ?? null,
    sessionHash: null, // In API-Routes nicht zwingend noetig
  };
}
