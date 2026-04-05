// POST /api/prevention/messages/broadcast — Nachricht an alle Teilnehmer
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendBroadcast } from "@/modules/praevention/services/messages.service";

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
    courseId?: string;
    subject?: string;
    message?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiges Format" }, { status: 400 });
  }

  if (!body.courseId || !body.message) {
    return NextResponse.json(
      { error: "courseId und message sind erforderlich" },
      { status: 400 },
    );
  }

  // Kursleiter-Berechtigung pruefen
  const { data: course } = await supabase
    .from("prevention_courses")
    .select("id")
    .eq("id", body.courseId)
    .eq("instructor_id", user.id)
    .maybeSingle();

  if (!course) {
    return NextResponse.json(
      { error: "Nur Kursleiter duerfen Broadcasts senden" },
      { status: 403 },
    );
  }

  const msg = await sendBroadcast(
    body.courseId,
    user.id,
    body.subject ?? "Mitteilung vom Kursleiter",
    body.message,
  );

  return NextResponse.json(msg, { status: 201 });
}
