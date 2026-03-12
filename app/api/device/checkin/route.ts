import { NextRequest, NextResponse } from "next/server";
import { authenticateDevice, isAuthError } from "@/lib/device/auth";

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiges Anfrage-Format" }, { status: 400 });
  }

  // Token-Auth: Authorization-Header > Body > Query-Param
  const authResult = await authenticateDevice(request, body);
  if (isAuthError(authResult)) return authResult;
  const { device, supabase } = authResult;

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

  // last_seen_at wird bereits in authenticateDevice() aktualisiert

  return NextResponse.json({
    success: true,
    checkedInAt: now,
    careCheckin: careCheckinOk,
  });
}
