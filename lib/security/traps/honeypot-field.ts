// lib/security/traps/honeypot-field.ts
// Prueft ob ein verstecktes "website"-Feld ausgefuellt wurde (Bot-Erkennung)
// Aufruf: In POST-Handlern von Login, Register, Bug-Report, Support

import { recordEvent } from "../risk-scorer";
import { logSecurityEvent } from "../security-logger";
import type { ClientKeys } from "../client-key";

/** True = Bot erkannt (Honeypot ausgefuellt). Daten verwerfen, 200 antworten. */
export async function checkHoneypotField(
  body: Record<string, unknown>,
  keys: ClientKeys,
  routePattern: string,
): Promise<boolean> {
  const honeypotValue = body.website;

  if (honeypotValue && String(honeypotValue).trim().length > 0) {
    await recordEvent(keys, "honeypot", 30, ["ip", "session"]);
    logSecurityEvent({
      keys,
      trapType: "honeypot",
      points: 30,
      effectiveScore: 30,
      stage: 1,
      routePattern,
    });
    return true; // Bot erkannt
  }

  return false; // Kein Bot
}
