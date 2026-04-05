// POST /api/prevention/session/complete — Sitzung abschliessen
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardPoints, checkAndAwardBadges } from "@/modules/gamification";

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
    weekNumber?: number;
    sessionType?: "daily_mini" | "weekly_main";
    durationSeconds?: number;
    moodBefore?: number;
    moodAfter?: number;
    voiceConsentGiven?: boolean;
    escalationFlag?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiges Format" }, { status: 400 });
  }

  const { enrollmentId, weekNumber, sessionType, durationSeconds } = body;

  if (!enrollmentId || !weekNumber || !sessionType || !durationSeconds) {
    return NextResponse.json(
      {
        error:
          "enrollmentId, weekNumber, sessionType und durationSeconds sind erforderlich",
      },
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

  // Sitzung erstellen und sofort abschliessen
  const now = new Date();
  const dayOfWeek = now.getDay() || 7; // Sonntag=7 statt 0

  const { data: session, error: sessionError } = await supabase
    .from("prevention_sessions")
    .insert({
      enrollment_id: enrollmentId,
      week_number: weekNumber,
      day_of_week: dayOfWeek,
      session_type: sessionType,
      completed_at: now.toISOString(),
      duration_seconds: durationSeconds,
      mood_before: body.moodBefore ?? null,
      mood_after: body.moodAfter ?? null,
      voice_consent_given: body.voiceConsentGiven ?? false,
      escalation_flag: body.escalationFlag ?? "normal",
    })
    .select()
    .single();

  if (sessionError) {
    console.error("Sitzung speichern fehlgeschlagen:", sessionError);
    return NextResponse.json(
      { error: "Sitzung konnte nicht gespeichert werden" },
      { status: 500 },
    );
  }

  // Gamification: Punkte vergeben (fire-and-forget)
  try {
    const action =
      sessionType === "weekly_main" ? "prevention_weekly" : "prevention_daily";
    await awardPoints(supabase, user.id, action);
    await checkAndAwardBadges(supabase, user.id);
  } catch (err) {
    // Gamification-Fehler sollen Sitzung nicht blockieren
    console.error("Gamification-Fehler (ignoriert):", err);
  }

  return NextResponse.json(session, { status: 201 });
}
