// lib/device-pairing/token.ts
// Welle B Task B2: JWT Pairing Token
// Plan: docs/plans/2026-04-19-senior-app-stufe1-implementation.md
//
// Erzeugt + verifiziert Short-Lived JWTs (10 min TTL) fuer den Pair-Flow.
// Senior-Geraet bekommt Token via /api/device/pair/start, zeigt QR mit Token,
// Angehoerigen-Handy scannt + ruft /api/device/pair/claim mit dem Token.

import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "crypto";

export const PAIRING_TOKEN_TTL_SECONDS = 600; // 10 Minuten

export interface PairingTokenPayload {
  pair_id: string;
  device_id: string;
  user_agent?: string;
  iat: number;
  exp: number;
}

export type VerifyResult =
  | { valid: true; payload: PairingTokenPayload }
  | { valid: false; reason: string };

function getSecret(): Uint8Array {
  const raw = process.env.DEVICE_PAIRING_SECRET;
  if (!raw || raw.length < 16) {
    // Dev/Test-Fallback. In Prod bricht der Build wenn env-var fehlt
    // (siehe lib/device-pairing/__tests__).
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "DEVICE_PAIRING_SECRET fehlt oder zu kurz (>= 16 Zeichen erforderlich)",
      );
    }
    return new TextEncoder().encode(
      "dev-secret-do-not-use-in-prod-32bytes-aaa",
    );
  }
  return new TextEncoder().encode(raw);
}

export async function createPairingToken(input: {
  device_id: string;
  user_agent?: string;
}): Promise<{ token: string; payload: PairingTokenPayload }> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + PAIRING_TOKEN_TTL_SECONDS;
  const pair_id = randomUUID();
  const payload: PairingTokenPayload = {
    pair_id,
    device_id: input.device_id,
    user_agent: input.user_agent,
    iat,
    exp,
  };
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(getSecret());
  return { token, payload };
}

export async function verifyPairingToken(token: string): Promise<VerifyResult> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.pair_id !== "string" ||
      typeof payload.device_id !== "string"
    ) {
      return { valid: false, reason: "payload-shape-invalid" };
    }
    return {
      valid: true,
      payload: payload as unknown as PairingTokenPayload,
    };
  } catch (e) {
    return { valid: false, reason: (e as Error).message };
  }
}
