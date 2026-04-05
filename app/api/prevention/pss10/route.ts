// POST /api/prevention/pss10 — PSS-10 Score speichern
// Speichert Pre- oder Post-Messung in prevention_enrollments
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  let body: {
    enrollmentId?: string;
    score?: number;
    type?: "pre" | "post";
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges Format" }, { status: 400 });
  }

  const { enrollmentId, score, type } = body;

  if (!enrollmentId || score === undefined || !type) {
    return NextResponse.json(
      { error: "enrollmentId, score und type (pre/post) sind erforderlich" },
      { status: 400 },
    );
  }

  if (score < 0 || score > 40) {
    return NextResponse.json(
      { error: "Score muss zwischen 0 und 40 liegen" },
      { status: 400 },
    );
  }

  // Enrollment-Berechtigung pruefen
  const { data: enrollment, error: enrollError } = await supabase
    .from("prevention_enrollments")
    .select("id, user_id")
    .eq("id", enrollmentId)
    .eq("user_id", user.id)
    .single();

  if (enrollError || !enrollment) {
    return NextResponse.json(
      { error: "Einschreibung nicht gefunden" },
      { status: 404 },
    );
  }

  // Score speichern (pre oder post)
  const now = new Date().toISOString();
  const updateData =
    type === "pre"
      ? { pre_pss10_score: score, pre_pss10_completed_at: now }
      : { post_pss10_score: score, post_pss10_completed_at: now };

  const { error: updateError } = await supabase
    .from("prevention_enrollments")
    .update(updateData)
    .eq("id", enrollmentId);

  if (updateError) {
    console.error("[pss10] Score speichern fehlgeschlagen:", updateError);
    return NextResponse.json(
      { error: "Score konnte nicht gespeichert werden" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    type,
    score,
    savedAt: now,
  });
}
