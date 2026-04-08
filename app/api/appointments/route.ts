// app/api/appointments/route.ts
// Nachbar.io — Eigene Termine abrufen (GET) und Slot buchen (POST)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/appointments
 * Eigene Termine laden (patient_id = user.id).
 * ?status=past → abgeschlossene/abgesagte Termine.
 * Standard: kommende Termine (booked/confirmed/in_progress).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Auth pruefen
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { searchParams } = request.nextUrl;
  const statusFilter = searchParams.get("status");

  let query = supabase
    .from("appointments")
    .select(
      "id, doctor_id, scheduled_at, duration_minutes, type, status, notes_encrypted, created_at, doctor_profiles:doctor_id(specialization, bio, users:user_id(display_name, avatar_url))",
    )
    .eq("patient_id", user.id);

  if (statusFilter === "past") {
    // Vergangene Termine: completed, cancelled, no_show
    query = query
      .in("status", ["completed", "cancelled", "no_show"])
      .order("scheduled_at", { ascending: false });
  } else {
    // Kommende Termine (Standard)
    query = query
      .in("status", ["booked", "confirmed", "in_progress"])
      .order("scheduled_at", { ascending: true });
  }

  const { data, error } = await query;

  if (error) {
    console.error("[appointments] Fehler beim Laden:", error);
    return NextResponse.json(
      { error: "Termine konnten nicht geladen werden" },
      { status: 500 },
    );
  }

  // Array zurueckgeben (Konvention)
  return NextResponse.json(data ?? []);
}

/**
 * POST /api/appointments
 * Terminslot buchen: Setzt status von 'available' auf 'booked'.
 * Body: { appointment_id: string, type?: 'video' | 'phone' | 'in_person' }
 * Atomares Update verhindert Doppelbuchungen.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Auth pruefen
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  // Body parsen
  let body: { appointment_id?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungueltiges Anfrage-Format" },
      { status: 400 },
    );
  }

  if (!body.appointment_id) {
    return NextResponse.json(
      { error: "appointment_id ist erforderlich" },
      { status: 400 },
    );
  }

  // Atomares Update: Nur wenn status noch 'available' ist (verhindert Doppelbuchung)
  const updateData: Record<string, unknown> = {
    patient_id: user.id,
    status: "booked",
  };
  if (body.type) {
    updateData.type = body.type;
  }

  const { data, error } = await supabase
    .from("appointments")
    .update(updateData)
    .eq("id", body.appointment_id)
    .eq("status", "available")
    .select()
    .single();

  if (error) {
    console.error("[appointments] Fehler beim Buchen:", error);
    // PGRST116 = kein Ergebnis bei .single() → Slot bereits vergeben
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Dieser Termin ist nicht mehr verfuegbar" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Termin konnte nicht gebucht werden" },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}
