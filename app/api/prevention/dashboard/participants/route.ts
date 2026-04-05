// GET /api/prevention/dashboard/participants — Teilnehmer-Details (nur Kursleiter)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParticipantDetails } from "@/modules/praevention/services/dashboard.service";

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

  const courseId = request.nextUrl.searchParams.get("courseId");
  if (!courseId) {
    return NextResponse.json(
      { error: "courseId ist erforderlich" },
      { status: 400 },
    );
  }

  // Kursleiter-Berechtigung pruefen
  const { data: course } = await supabase
    .from("prevention_courses")
    .select("id")
    .eq("id", courseId)
    .eq("instructor_id", user.id)
    .maybeSingle();

  if (!course) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  const participants = await getParticipantDetails(courseId);
  return NextResponse.json(participants);
}
