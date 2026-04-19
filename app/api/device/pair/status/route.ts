// app/api/device/pair/status/route.ts
// Welle B Task B5: Senior pollt mit pair_token, holt refresh_token wenn paired
// Plan: docs/plans/2026-04-19-senior-app-stufe1-implementation.md
//
// Unauthenticated GET. Senior-Geraet pollt alle ~2s mit dem pair_token,
// solange Pair-JWT gueltig (10 min). Sobald Caregiver via /pair/claim
// das Token "geclaimed" hat, liegt der refresh_token in Redis und wird
// hier einmalig zurueckgegeben (delete-after-read = One-Time-Pickup).

import { NextResponse, type NextRequest } from "next/server";
import { getSecurityRedis } from "@/lib/security/redis";
import { verifyPairingToken } from "@/lib/device-pairing/token";

interface PairRedisPayload {
  refresh_token: string;
  user_id: string;
  device_id: string;
  expires_at: string;
  claimed_by?: string;
}

function parseRedisPayload(value: unknown): PairRedisPayload | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as PairRedisPayload;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    const v = value as Partial<PairRedisPayload>;
    if (typeof v.refresh_token === "string" && typeof v.user_id === "string") {
      return v as PairRedisPayload;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const pair_token = request.nextUrl.searchParams.get("pair_token");
  if (!pair_token) {
    return NextResponse.json(
      { error: "pair_token erforderlich" },
      { status: 400 },
    );
  }

  const verified = await verifyPairingToken(pair_token);
  if (!verified.valid) {
    return NextResponse.json(
      { error: "pair_token ungueltig oder abgelaufen" },
      { status: 401 },
    );
  }

  const redis = getSecurityRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Pairing-Service nicht verfuegbar (Redis)" },
      { status: 503 },
    );
  }

  const key = `pair:${verified.payload.pair_id}`;
  const raw = await redis.get(key);
  const payload = parseRedisPayload(raw);

  if (!payload) {
    return NextResponse.json({ status: "pending" });
  }

  // One-Time-Pickup: Eintrag konsumieren, damit ein Replay nicht
  // erneut den refresh_token preisgibt.
  await redis.del(key);

  return NextResponse.json({
    status: "paired",
    refresh_token: payload.refresh_token,
    user_id: payload.user_id,
    device_id: payload.device_id,
    expires_at: payload.expires_at,
  });
}
