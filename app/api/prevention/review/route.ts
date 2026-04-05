// GET /api/prevention/review?enrollmentId=... — Bewertung laden
// POST /api/prevention/review — Kurs-Bewertung schreiben (fuer Gold-Stufe)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  const enrollmentId = request.nextUrl.searchParams.get("enrollmentId");
  if (!enrollmentId) {
    return NextResponse.json(
      { error: "enrollmentId erforderlich" },
      { status: 400 },
    );
  }

  const { data: review } = await supabase
    .from("prevention_reviews")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json(review);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  let body: { enrollmentId?: string; rating?: number; text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiges Format" }, { status: 400 });
  }

  if (!body.enrollmentId || !body.rating) {
    return NextResponse.json(
      { error: "enrollmentId und rating erforderlich" },
      { status: 400 },
    );
  }

  if (body.rating < 1 || body.rating > 5) {
    return NextResponse.json(
      { error: "Bewertung muss zwischen 1 und 5 liegen" },
      { status: 400 },
    );
  }

  // Pruefen: Enrollment gehoert dem User und Kurs ist abgeschlossen
  const { data: enrollment } = await supabase
    .from("prevention_enrollments")
    .select("id, certificate_generated")
    .eq("id", body.enrollmentId)
    .eq("user_id", user.id)
    .single();

  if (!enrollment) {
    return NextResponse.json(
      { error: "Einschreibung nicht gefunden" },
      { status: 404 },
    );
  }

  if (!enrollment.certificate_generated) {
    return NextResponse.json(
      { error: "Kurs muss zuerst abgeschlossen werden" },
      { status: 400 },
    );
  }

  // Upsert: Bewertung erstellen oder aktualisieren
  const { data: existing } = await supabase
    .from("prevention_reviews")
    .select("id")
    .eq("enrollment_id", body.enrollmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("prevention_reviews")
      .update({ rating: body.rating, text: body.text ?? null })
      .eq("id", existing.id);
  } else {
    await supabase.from("prevention_reviews").insert({
      enrollment_id: body.enrollmentId,
      user_id: user.id,
      rating: body.rating,
      text: body.text ?? null,
    });
  }

  return NextResponse.json({ success: true });
}
