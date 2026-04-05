// POST /api/prevention/session — Taegliche KI-Sitzung
// Nimmt Nutzer-Nachricht, gibt Claude-Haiku-Antwort + Eskalations-Flag zurueck.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateSessionResponse,
  detectEscalation,
} from "@/modules/praevention/services/ki-session.service";
import { calculateCurrentWeek } from "@/modules/praevention/services/sessions.service";

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
    message?: string;
    enrollmentId?: string;
    sessionHistory?: { role: "user" | "assistant"; content: string }[];
    moodBefore?: number | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges Format" }, { status: 400 });
  }

  const { message, enrollmentId, sessionHistory = [], moodBefore } = body;

  if (!message || !enrollmentId) {
    return NextResponse.json(
      { error: "message und enrollmentId sind erforderlich" },
      { status: 400 },
    );
  }

  // Enrollment + Kurs laden
  const { data: enrollment, error: enrollError } = await supabase
    .from("prevention_enrollments")
    .select("id, user_id, course_id")
    .eq("id", enrollmentId)
    .eq("user_id", user.id)
    .single();

  if (enrollError || !enrollment) {
    return NextResponse.json(
      { error: "Einschreibung nicht gefunden" },
      { status: 404 },
    );
  }

  // Kurs-Start laden fuer aktuelle Woche
  const { data: course } = await supabase
    .from("prevention_courses")
    .select("starts_at")
    .eq("id", enrollment.course_id)
    .single();

  const weekNumber = course ? calculateCurrentWeek(course.starts_at) : 1;

  // Wochen-spezifischen KI-Prompt laden (Kursleitung kann anpassen)
  const { data: content } = await supabase
    .from("prevention_course_content")
    .select("ki_system_prompt")
    .eq("course_id", enrollment.course_id)
    .eq("week_number", weekNumber)
    .single();

  // Schnelle Signalwort-Pruefung (vor KI-Call, spart API-Kosten bei Rot)
  const quickEscalation = detectEscalation(message);

  try {
    const response = await generateSessionResponse({
      userMessage: message,
      weekNumber,
      weekSystemPrompt: content?.ki_system_prompt ?? null,
      moodBefore: moodBefore ?? null,
      sessionHistory,
    });

    // Eskalation in DB loggen wenn nicht gruen
    if (response.escalationLevel !== "green") {
      await supabase.from("prevention_sessions").insert({
        enrollment_id: enrollmentId,
        week_number: weekNumber,
        day_of_week: new Date().getDay() || 7,
        session_type: "daily_mini",
        escalation_flag:
          response.escalationLevel === "red"
            ? "abgebrochen_eskalation"
            : "belastung_erkannt",
        mood_before: moodBefore ?? null,
        voice_consent_given: false,
      });
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("[prevention/session] KI-Fehler:", err);
    return NextResponse.json(
      { error: "KI-Sitzung konnte nicht gestartet werden" },
      { status: 500 },
    );
  }
}
