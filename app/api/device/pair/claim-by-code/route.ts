// app/api/device/pair/claim-by-code/route.ts
// Welle B Folgearbeit: Senior-Geraet claimt 6-stelligen Code.
// Plan: docs/plans/2026-04-19-welle-b-folgearbeit-design.md Teil 2.
//
// Kein Auth (Senior hat noch keine Session).
// Body: { code (6 Ziffern), device_id }
// Rate-Limit: 5 Fehlversuche / IP+device_id / Stunde.
// Effekt:
//   1. Liest pair-code:<code> aus Redis (Single-Use).
//   2. Generiert refresh_token, INSERT in device_refresh_tokens.
//   3. DELETE pair-code:<code> (Replay-Schutz).
// Response: { refresh_token, user_id, device_id, expires_at }

import { NextResponse, type NextRequest } from "next/server";
import { getSecurityRedis } from "@/lib/security/redis";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  pairCodeRedisKey,
  type PairCodePayload,
} from "@/lib/device-pairing/pair-code";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} from "@/lib/device-pairing/refresh-token";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 3600; // 1h

function rateLimitKey(ip: string, device_id: string): string {
  return `pair-code-rl:${ip}:${device_id}`;
}

export async function POST(request: NextRequest) {
  // Body parsen
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "ungueltiger JSON-Body" },
      { status: 400 },
    );
  }
  if (typeof raw !== "object" || raw === null) {
    return NextResponse.json(
      { error: "Body muss ein Objekt sein" },
      { status: 400 },
    );
  }
  const body = raw as Record<string, unknown>;
  const code = typeof body.code === "string" ? body.code : null;
  const device_id = typeof body.device_id === "string" ? body.device_id : null;

  if (!code) {
    return NextResponse.json({ error: "code erforderlich" }, { status: 400 });
  }
  if (!device_id) {
    return NextResponse.json(
      { error: "device_id erforderlich" },
      { status: 400 },
    );
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Code-Format ungueltig (6 Ziffern erwartet)" },
      { status: 400 },
    );
  }

  // Redis verfuegbar?
  const redis = getSecurityRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Pairing-Service nicht verfuegbar (Redis)" },
      { status: 503 },
    );
  }

  // Rate-Limit pruefen (incr + conditional expire beim 1. Versuch)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rlKey = rateLimitKey(ip, device_id);
  const attempts = await redis.incr(rlKey);
  if (attempts === 1) {
    await redis.expire(rlKey, RATE_LIMIT_WINDOW_SECONDS);
  }
  if (attempts > RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: "Zu viele Versuche. Bitte eine Stunde warten." },
      { status: 429 },
    );
  }

  // Code aus Redis lesen
  const rawPayload = await redis.get<string>(pairCodeRedisKey(code));
  if (!rawPayload) {
    return NextResponse.json(
      { error: "Code ungueltig oder abgelaufen" },
      { status: 401 },
    );
  }
  const payload =
    typeof rawPayload === "string"
      ? (JSON.parse(rawPayload) as PairCodePayload)
      : (rawPayload as PairCodePayload);

  // Refresh-Token erzeugen + persistieren
  const refresh_token = generateRefreshToken();
  const token_hash = hashRefreshToken(refresh_token);
  const expires_at = refreshTokenExpiry();

  const admin = getAdminSupabase();
  const { error: insertError } = await admin
    .from("device_refresh_tokens")
    .insert({
      user_id: payload.senior_user_id,
      device_id,
      token_hash,
      pairing_method: "code",
      user_agent: request.headers.get("user-agent")?.slice(0, 200) ?? null,
      expires_at: expires_at.toISOString(),
    });
  if (insertError) {
    return NextResponse.json(
      { error: "Konnte refresh_token nicht speichern" },
      { status: 500 },
    );
  }

  // Single-Use: Code aus Redis loeschen
  await redis.del(pairCodeRedisKey(code));

  return NextResponse.json({
    refresh_token,
    user_id: payload.senior_user_id,
    device_id,
    expires_at: expires_at.toISOString(),
  });
}
