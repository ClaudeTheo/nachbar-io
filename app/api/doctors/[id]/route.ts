// app/api/doctors/[id]/route.ts
// Nachbar.io — Einzelnes Arzt-Profil abrufen (GET)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateDistance } from "@/lib/geo/haversine";

export const dynamic = "force-dynamic";

// Quartier-Zentrum Bad Saeckingen
const CENTER_LAT = 47.5535;
const CENTER_LNG = 7.964;

/**
 * GET /api/doctors/[id]
 * Einzelnes Arzt-Profil laden (user_id = id).
 * Gibt 404 zurueck wenn nicht gefunden oder nicht sichtbar.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("doctor_profiles")
    .select(
      "user_id, specialization, bio, visible, accepts_new_patients, video_consultation, quarter_ids, latitude, longitude, address, phone, users(display_name, avatar_url)",
    )
    .eq("user_id", id)
    .eq("visible", true)
    .maybeSingle();

  if (error) {
    console.error("[doctors] Fehler beim Laden:", error);
    return NextResponse.json(
      { error: "Arzt-Profil konnte nicht geladen werden" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Arzt nicht gefunden" },
      { status: 404 },
    );
  }

  // Distanz berechnen (nur wenn Koordinaten vorhanden)
  let distance_km: number | null = null;
  if (data.latitude != null && data.longitude != null) {
    distance_km = calculateDistance(
      CENTER_LAT,
      CENTER_LNG,
      data.latitude as number,
      data.longitude as number,
    );
  }

  return NextResponse.json({ ...data, distance_km });
}
