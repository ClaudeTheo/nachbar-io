// app/api/device/pair/claim/route.ts
// Welle B Task B4: Angehoeriger scannt Senior-QR -> verbindet Geraet
// Plan: docs/plans/2026-04-19-senior-app-stufe1-implementation.md
//
// Auth: Caller (Angehoeriger) muss eingeloggt sein.
// Body: { pair_token (JWT vom Senior-Geraet), senior_user_id }
// Vorbedingung: aktiver caregiver_link zwischen Caller und senior_user_id.
// Effekt:
//   1. Generiert refresh_token (32 Bytes random)
//   2. Speichert HASH in device_refresh_tokens (Service-Role, da unter
//      User-Context Senior keine Inserts macht — wir handeln im Auftrag)
//   3. Stellt refresh_token in Redis unter pair:<pair_id> (5 min TTL),
//      damit Senior-Geraet via /api/device/pair/status pollen kann.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getSecurityRedis } from "@/lib/security/redis";
import { verifyPairingToken } from "@/lib/device-pairing/token";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} from "@/lib/device-pairing/refresh-token";

const PAIR_REDIS_TTL_SECONDS = 300; // 5 Minuten - Senior pollt 2-Sek-Takt

export async function POST(request: NextRequest) {
  // Auth-Check (Caller = Angehoeriger)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

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
  const pair_token =
    typeof body.pair_token === "string" ? body.pair_token : null;
  const senior_user_id =
    typeof body.senior_user_id === "string" ? body.senior_user_id : null;

  if (!pair_token) {
    return NextResponse.json(
      { error: "pair_token erforderlich" },
      { status: 400 },
    );
  }
  if (!senior_user_id) {
    return NextResponse.json(
      { error: "senior_user_id erforderlich" },
      { status: 400 },
    );
  }

  // Pair-Token verifizieren
  const verified = await verifyPairingToken(pair_token);
  if (!verified.valid) {
    return NextResponse.json(
      { error: "pair_token ungueltig oder abgelaufen" },
      { status: 401 },
    );
  }
  const { pair_id, device_id, user_agent } = verified.payload;

  // Caregiver-Link pruefen (Caller muss aktiver caregiver fuer Senior sein)
  const { data: link } = await supabase
    .from("caregiver_links")
    .select("id, resident_id, caregiver_id")
    .eq("caregiver_id", user.id)
    .eq("resident_id", senior_user_id)
    .is("revoked_at", null)
    .maybeSingle();
  if (!link) {
    return NextResponse.json(
      { error: "Kein aktiver caregiver_link fuer dieses Senior-Konto" },
      { status: 403 },
    );
  }

  // Refresh-Token erzeugen + persistieren
  const refresh_token = generateRefreshToken();
  const token_hash = hashRefreshToken(refresh_token);
  const expires_at = refreshTokenExpiry();

  const admin = getAdminSupabase();
  const { error: insertError } = await admin
    .from("device_refresh_tokens")
    .insert({
      user_id: senior_user_id,
      device_id,
      token_hash,
      pairing_method: "qr",
      user_agent: user_agent ?? null,
      expires_at: expires_at.toISOString(),
    });
  if (insertError) {
    return NextResponse.json(
      { error: "Konnte refresh_token nicht speichern" },
      { status: 500 },
    );
  }

  // In Redis ablegen, damit Senior-Geraet abholen kann
  const redis = getSecurityRedis();
  if (!redis) {
    // Ohne Redis hat das Senior-Geraet keinen Weg, das Token abzuholen.
    // Lieber 503 als stilles Versagen.
    return NextResponse.json(
      { error: "Pairing-Service nicht verfuegbar (Redis)" },
      { status: 503 },
    );
  }
  await redis.set(
    `pair:${pair_id}`,
    JSON.stringify({
      refresh_token,
      user_id: senior_user_id,
      device_id,
      expires_at: expires_at.toISOString(),
      claimed_by: user.id,
    }),
    { ex: PAIR_REDIS_TTL_SECONDS },
  );

  return NextResponse.json({
    ok: true,
    pair_id,
    senior_user_id,
    device_id,
  });
}
