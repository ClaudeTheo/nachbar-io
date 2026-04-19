// app/api/device/pair/refresh/route.ts
// Welle B Task B7: Token-Rotation - Senior-Geraet erneuert refresh_token
// Plan: docs/plans/2026-04-19-senior-app-stufe1-implementation.md
//
// Unauthenticated POST mit { refresh_token }. Server hashiert, sucht in
// device_refresh_tokens (aktiv + nicht abgelaufen). Wenn gefunden:
// - Neuen refresh_token erzeugen + in DB inserten
// - Altes Row als revoked markieren (Reason: 'rotated')
// - last_used_at des alten Rows ist implizit (Insert ueberschreibt nicht)
// - Neuen Token zurueckgeben

import { NextResponse, type NextRequest } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} from "@/lib/device-pairing/refresh-token";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "ungueltiger JSON-Body" },
      { status: 400 },
    );
  }
  const refresh_token =
    typeof (body as { refresh_token?: unknown })?.refresh_token === "string"
      ? (body as { refresh_token: string }).refresh_token
      : null;
  if (!refresh_token) {
    return NextResponse.json(
      { error: "refresh_token erforderlich" },
      { status: 400 },
    );
  }

  const token_hash = hashRefreshToken(refresh_token);
  const admin = getAdminSupabase();

  const { data: row, error: lookupError } = await admin
    .from("device_refresh_tokens")
    .select("id, user_id, device_id, user_agent, expires_at")
    .eq("token_hash", token_hash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (lookupError || !row) {
    return NextResponse.json(
      { error: "refresh_token ungueltig oder abgelaufen" },
      { status: 401 },
    );
  }

  // Neuen Token erzeugen
  const new_token = generateRefreshToken();
  const new_hash = hashRefreshToken(new_token);
  const new_expires = refreshTokenExpiry();

  const { error: insertError } = await admin
    .from("device_refresh_tokens")
    .insert({
      user_id: row.user_id,
      device_id: row.device_id,
      token_hash: new_hash,
      pairing_method: "qr",
      user_agent: row.user_agent,
      expires_at: new_expires.toISOString(),
    });
  if (insertError) {
    return NextResponse.json(
      { error: "Konnte neuen refresh_token nicht speichern" },
      { status: 500 },
    );
  }

  // Altes Row revoken
  await admin
    .from("device_refresh_tokens")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: "rotated",
    })
    .eq("id", row.id);

  return NextResponse.json({
    refresh_token: new_token,
    user_id: row.user_id,
    device_id: row.device_id,
    expires_at: new_expires.toISOString(),
  });
}
