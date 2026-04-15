// app/api/doctors/[id]/route.ts
// Nachbar.io — Einzelnes Arzt-Profil abrufen (GET)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateDistance } from "@/lib/geo/haversine";

export const dynamic = "force-dynamic";

// Quartier-Zentrum Bad Saeckingen
const CENTER_LAT = 47.5535;
const CENTER_LNG = 7.964;

interface DoctorProfileRow {
  id: string;
  user_id: string;
  specialization: string[] | null;
  bio: string | null;
  avatar_url: string | null;
  visible: boolean | null;
  accepts_new_patients: boolean | null;
  video_consultation: boolean | null;
  quarter_ids: string[] | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  phone: string | null;
}

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
      "id, user_id, specialization, bio, avatar_url, visible, accepts_new_patients, video_consultation, quarter_ids, latitude, longitude, address, phone",
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

  const profile = data as DoctorProfileRow;
  const { data: userProfile, error: userError } = await supabase
    .from("users")
    .select("display_name, avatar_url")
    .eq("id", profile.user_id)
    .maybeSingle();

  if (userError) {
    console.warn("[doctors] Nutzer-Profil konnte nicht geladen werden:", userError);
  }

  // Distanz berechnen (nur wenn Koordinaten vorhanden)
  let distance_km: number | null = null;
  if (profile.latitude != null && profile.longitude != null) {
    distance_km = calculateDistance(
      CENTER_LAT,
      CENTER_LNG,
      profile.latitude,
      profile.longitude,
    );
  }

  return NextResponse.json({
    ...profile,
    distance_km,
    users: userProfile
      ? {
          display_name: userProfile.display_name?.trim() || "Arzt",
          avatar_url: userProfile.avatar_url ?? profile.avatar_url,
        }
      : null,
  });
}
