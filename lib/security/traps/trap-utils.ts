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

function buildStableDeviceFingerprintInputNode(headers: {
  get(name: string): string | null;
}): string {
  return [
    headers.get("user-agent") || "",
    headers.get("accept-language") || "",
    headers.get("accept-encoding") || "",
    headers.get("sec-ch-ua") || "",
    headers.get("sec-ch-ua-platform") || "",
    headers.get("sec-ch-ua-mobile") || "",
  ].join("|");
}

/** Baut ClientKeys aus einem API-Route-Request (Node.js Runtime) */
export function buildClientKeysNode(
  request: NextRequest,
  userId?: string | null,
): ClientKeys {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  // Fallback-Kette: x-forwarded-for → x-real-ip → request.ip → "unknown"
  const ip =
    forwarded?.split(",")[0].trim() ||
    realIp ||
    (request as { ip?: string }).ip ||
    "unknown";

  // SYNC: Device-Hash muss mit buildDeviceHash() in client-key.ts uebereinstimmen
  // Gleiche stabilen Signale, gleicher Salt — nur Node.js crypto statt Web Crypto
  const bitmap = buildHeaderPresenceBitmapNode(request.headers);
  const deviceHash = createHash("sha256")
    .update(buildStableDeviceFingerprintInputNode(request.headers) + getDailySalt())
    .digest("hex")
    .slice(0, 16);

  return {
    ipHash: hashIpNode(ip),
    userId: userId ?? null,
    sessionHash: null, // In API-Routes nicht zwingend noetig
    deviceHash,
    headerBitmap: bitmap,
  };
}

// SYNC: Header-Presence-Bitmap muss mit buildHeaderPresenceBitmap() in client-key.ts uebereinstimmen
// Gleiche Bit-Zuordnung, nur als Node.js-kompatible Funktion
function buildHeaderPresenceBitmapNode(headers: {
  get(name: string): string | null;
}): number {
  let bitmap = 0;
  if (headers.get("accept")) bitmap |= 0x01;
  if (headers.get("accept-language")) bitmap |= 0x02;
  if (headers.get("accept-encoding")) bitmap |= 0x04;
  if (headers.get("sec-ch-ua")) bitmap |= 0x08;
  if (headers.get("sec-fetch-site")) bitmap |= 0x10;
  if (headers.get("sec-fetch-mode")) bitmap |= 0x20;
  if (headers.get("upgrade-insecure-requests")) bitmap |= 0x40;
  if (headers.get("referer")) bitmap |= 0x80;
  return bitmap;
}
