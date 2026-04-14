// app/api/doctors/route.ts
// Nachbar.io — Aerzte auflisten (GET) mit Entfernungsberechnung

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateDistance } from "@/lib/geo/haversine";

export const dynamic = "force-dynamic";

// Quartier-Zentrum Bad Saeckingen
const CENTER_LAT = 47.5535;
const CENTER_LNG = 7.964;
const MAX_RADIUS_KM = 20;

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

interface DoctorUserRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * GET /api/doctors
 * Sichtbare Aerzte im Umkreis von 20 km auflisten.
 * Optional: ?specialization=Allgemeinmedizin zum Filtern nach Fachgebiet.
 * Sortiert nach Entfernung (aufsteigend).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const specialization = searchParams.get("specialization");

  // Alle sichtbaren Aerzte mit Koordinaten laden
  let query = supabase
    .from("doctor_profiles")
    .select(
      "id, user_id, specialization, bio, avatar_url, visible, accepts_new_patients, video_consultation, quarter_ids, latitude, longitude, address, phone",
    )
    .eq("visible", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  // Fachgebiet-Filter (specialization ist ein text[]-Array in Supabase)
  if (specialization) {
    query = query.contains("specialization", [specialization]);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[doctors] Fehler beim Laden:", error);
    return NextResponse.json(
      { error: "Aerzte konnten nicht geladen werden" },
      { status: 500 },
    );
  }

  const doctorProfiles = (data ?? []) as DoctorProfileRow[];
  const doctorUserIds = Array.from(
    new Set(
      doctorProfiles
        .map((doctor) => doctor.user_id)
        .filter(
          (userId): userId is string =>
            typeof userId === "string" && userId.length > 0,
        ),
    ),
  );

  let userMap = new Map<string, { display_name: string; avatar_url: string | null }>();

  if (doctorUserIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, display_name, avatar_url")
      .in("id", doctorUserIds);

    if (usersError) {
      console.warn("[doctors] Nutzer-Profile konnten nicht geladen werden:", usersError);
    } else {
      userMap = new Map(
        ((users ?? []) as DoctorUserRow[]).map((user) => [
          user.id,
          {
            display_name: user.display_name?.trim() || "Arzt",
            avatar_url: user.avatar_url,
          },
        ]),
      );
    }
  }

  // Distanz berechnen, filtern und sortieren
  const results = doctorProfiles
    .map((doc) => {
      const distance_km = calculateDistance(
        CENTER_LAT,
        CENTER_LNG,
        doc.latitude as number,
        doc.longitude as number,
      );
      return {
        ...doc,
        distance_km,
        users: userMap.get(doc.user_id) ?? null,
      };
    })
    .filter((doc) => doc.distance_km <= MAX_RADIUS_KM)
    .sort((a, b) => a.distance_km - b.distance_km);

  // Array zurueckgeben (NICHT als Wrapper-Objekt — Konvention)
  return NextResponse.json(results);
}
