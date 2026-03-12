import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service-Role Client (Token-basierte Auth, kein User-Session noetig)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert");
  }
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token } = body;

  if (!token || typeof token !== "string" || token.length < 16 || token.length > 128 || !/^[a-f0-9]+$/i.test(token)) {
    return NextResponse.json({ error: "Ungueltiges Token-Format" }, { status: 401 });
  }

  const supabase = getSupabase();

  // Token validieren
  const { data: device, error: tokenError } = await supabase
    .from("device_tokens")
    .select("id, household_id")
    .eq("token", token)
    .single();

  if (tokenError || !device) {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // User-ID des Haushalt-Eigentümers ermitteln (fuer Care-Checkin)
  const { data: member } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", device.household_id)
    .not("verified_at", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const userId = member?.user_id ?? null;
  let careCheckinOk = false;

  // Care-Checkin im neuen System erstellen (care_checkins Tabelle)
  if (userId) {
    const { error: careError } = await supabase
      .from("care_checkins")
      .insert({
        senior_id: userId,
        status: "ok",
        mood: "good",
        note: "Wecker bestaetigt via reTerminal E1001",
        scheduled_at: now,
        completed_at: now,
        escalated: false,
      });

    if (!careError) {
      careCheckinOk = true;

      // Audit-Log schreiben
      try {
        await supabase.from("care_audit_log").insert({
          senior_id: userId,
          actor_id: userId,
          event_type: "checkin_ok",
          reference_type: "care_checkins",
          metadata: { source: "reTerminal_E1001", device_id: device.id },
        });
      } catch {
        // Audit-Fehler blockiert nicht den Check-in
      }
    } else {
      console.error("[device/checkin] Care-Checkin fehlgeschlagen:", careError);
    }
  }

  // Legacy-Checkin in senior_checkins (Abwaertskompatibilitaet)
  const { error: legacyError } = await supabase
    .from("senior_checkins")
    .insert({
      user_id: device.household_id,
      checked_in_at: now,
    });

  if (!careCheckinOk && legacyError) {
    return NextResponse.json({ error: "Check-in fehlgeschlagen" }, { status: 500 });
  }

  // Last-seen aktualisieren
  await supabase
    .from("device_tokens")
    .update({ last_seen_at: now })
    .eq("id", device.id);

  return NextResponse.json({
    success: true,
    checkedInAt: now,
    careCheckin: careCheckinOk,
  });
}
