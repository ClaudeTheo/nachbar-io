// app/api/device/pair/start-code/route.ts
// Welle B Folgearbeit: Angehoeriger erzeugt 6-stelligen Pair-Code fuer Senior-Geraet.
// Plan: docs/plans/2026-04-19-welle-b-folgearbeit-design.md Teil 2.
//
// Auth: Caller (Angehoeriger) muss eingeloggt sein.
// Body: { senior_user_id }
// Vorbedingung: aktiver caregiver_link zwischen Caller und senior_user_id.
// Effekt: Code in Redis unter pair-code:<code> (10 min TTL, single-use).
// Response: { code, expires_in }

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSecurityRedis } from "@/lib/security/redis";
import {
  generatePairCode,
  pairCodeRedisKey,
  PAIR_CODE_REDIS_TTL_SECONDS,
  type PairCodePayload,
} from "@/lib/device-pairing/pair-code";

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
  const senior_user_id =
    typeof body.senior_user_id === "string" ? body.senior_user_id : null;
  if (!senior_user_id) {
    return NextResponse.json(
      { error: "senior_user_id erforderlich" },
      { status: 400 },
    );
  }

  // Caregiver-Link pruefen
  const { data: link } = await supabase
    .from("caregiver_links")
    .select("id")
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

  // Redis verfuegbar?
  const redis = getSecurityRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Pairing-Service nicht verfuegbar (Redis)" },
      { status: 503 },
    );
  }

  // Code erzeugen + persistieren
  const code = generatePairCode();
  const payload: PairCodePayload = {
    senior_user_id,
    caregiver_id: user.id,
    created_at: new Date().toISOString(),
  };
  await redis.set(pairCodeRedisKey(code), JSON.stringify(payload), {
    ex: PAIR_CODE_REDIS_TTL_SECONDS,
  });

  return NextResponse.json({
    code,
    expires_in: PAIR_CODE_REDIS_TTL_SECONDS,
  });
}
