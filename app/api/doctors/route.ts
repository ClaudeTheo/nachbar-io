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
      "user_id, specialization, bio, visible, accepts_new_patients, video_consultation, quarter_ids, latitude, longitude, address, phone, users(display_name, avatar_url)",
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

  // Distanz berechnen, filtern und sortieren
  const results = (data ?? [])
    .map((doc) => {
      const distance_km = calculateDistance(
        CENTER_LAT,
        CENTER_LNG,
        doc.latitude as number,
        doc.longitude as number,
      );
      return { ...doc, distance_km };
    })
    .filter((doc) => doc.distance_km <= MAX_RADIUS_KM)
    .sort((a, b) => a.distance_km - b.distance_km);

  // Array zurueckgeben (NICHT als Wrapper-Objekt — Konvention)
  return NextResponse.json(results);
}
