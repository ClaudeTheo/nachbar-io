// POST /api/prevention/enroll — In Praeventionskurs einschreiben
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
    courseId?: string;
    payerType?: string;
    payerUserId?: string;
    payerName?: string;
    payerEmail?: string;
    insuranceProvider?: string;
    insuranceConfigId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiges Format" }, { status: 400 });
  }

  const { courseId } = body;
  if (!courseId) {
    return NextResponse.json(
      { error: "courseId ist erforderlich" },
      { status: 400 },
    );
  }

  // Kurs existiert und hat Kapazitaet?
  const { data: course, error: courseError } = await supabase
    .from("prevention_courses")
    .select("id, max_participants, status")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    return NextResponse.json({ error: "Kurs nicht gefunden" }, { status: 404 });
  }

  if (course.status === "completed" || course.status === "cancelled") {
    return NextResponse.json(
      { error: "Kurs ist nicht mehr verfuegbar" },
      { status: 400 },
    );
  }

  // Bereits eingeschrieben?
  const { data: existing } = await supabase
    .from("prevention_enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Sie sind bereits in diesem Kurs eingeschrieben" },
      { status: 409 },
    );
  }

  // Kapazitaet pruefen
  const { count } = await supabase
    .from("prevention_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  if ((count ?? 0) >= course.max_participants) {
    return NextResponse.json(
      { error: "Der Kurs ist leider voll" },
      { status: 400 },
    );
  }

  // Einschreiben
  const { data: enrollment, error: enrollError } = await supabase
    .from("prevention_enrollments")
    .insert({
      course_id: courseId,
      user_id: user.id,
      payer_type: body.payerType ?? "pilot_free",
      payer_user_id: body.payerUserId ?? null,
      payer_name: body.payerName ?? null,
      payer_email: body.payerEmail ?? null,
      insurance_provider: body.insuranceProvider ?? null,
      insurance_config_id: body.insuranceConfigId ?? null,
    })
    .select()
    .single();

  if (enrollError) {
    console.error("Einschreibung fehlgeschlagen:", enrollError);
    return NextResponse.json(
      { error: "Einschreibung fehlgeschlagen" },
      { status: 500 },
    );
  }

  return NextResponse.json(enrollment, { status: 201 });
}
