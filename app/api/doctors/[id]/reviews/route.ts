// app/api/doctors/[id]/reviews/route.ts
// Nachbar.io — Arzt-Bewertungen: Abrufen (GET) und Erstellen (POST)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateReview } from "@/lib/doctors";

export const dynamic = "force-dynamic";

/**
 * GET /api/doctors/[id]/reviews
 * Bewertungen eines Arztes laden (max 20, neueste zuerst).
 * Join auf users fuer patient_display_name.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("doctor_reviews")
    .select("id, rating, text, created_at, users:patient_id(display_name)")
    .eq("doctor_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[doctors/reviews] Fehler beim Laden:", error);
    return NextResponse.json(
      { error: "Bewertungen konnten nicht geladen werden" },
      { status: 500 },
    );
  }

  // Array zurueckgeben (Konvention)
  return NextResponse.json(data ?? []);
}

/**
 * POST /api/doctors/[id]/reviews
 * Neue Bewertung fuer einen Arzt erstellen.
 * Auth erforderlich. Body: { rating: 1-5, text?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungueltiges Anfrage-Format" },
      { status: 400 },
    );
  }

  // Validierung
  const validation = validateReview(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Bewertung einfuegen
  const { data, error } = await supabase
    .from("doctor_reviews")
    .insert({
      doctor_id: id,
      patient_id: user.id,
      rating: body.rating as number,
      text: (body.text as string) ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[doctors/reviews] Fehler beim Erstellen:", error);
    // Duplikat-Check (unique constraint auf doctor_id + patient_id)
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Sie haben diesen Arzt bereits bewertet" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Bewertung konnte nicht gespeichert werden" },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}
