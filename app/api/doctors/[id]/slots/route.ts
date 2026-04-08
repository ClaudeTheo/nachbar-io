// app/api/doctors/[id]/slots/route.ts
// Nachbar.io — Verfuegbare Terminslots eines Arztes (GET)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/doctors/[id]/slots
 * Verfuegbare Terminslots (status='available') der naechsten 14 Tage laden.
 * WICHTIG: doctor_id in appointments verweist auf auth.users.id
 * (= user_id aus doctor_profiles), NICHT auf die Profil-ID.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const now = new Date();
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("appointments")
    .select("id, scheduled_at, duration_minutes, type")
    .eq("doctor_id", id)
    .eq("status", "available")
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", twoWeeks.toISOString())
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[doctors/slots] Fehler beim Laden:", error);
    return NextResponse.json(
      { error: "Terminslots konnten nicht geladen werden" },
      { status: 500 },
    );
  }

  // Array zurueckgeben (Konvention)
  return NextResponse.json(data ?? []);
}
