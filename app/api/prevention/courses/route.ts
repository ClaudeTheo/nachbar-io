// GET /api/prevention/courses — Verfuegbare Praeventionskurse
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  // Alle aktiven/geplanten Kurse mit Kursleiter-Info und Teilnehmerzahl
  const { data: courses, error } = await supabase
    .from("prevention_courses")
    .select(
      `
      *,
      instructor:users!prevention_courses_instructor_id_fkey(display_name, avatar_url)
    `,
    )
    .in("status", ["planned", "active"])
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Praevention-Kurse laden fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Kurse konnten nicht geladen werden" },
      { status: 500 },
    );
  }

  // Teilnehmerzahl pro Kurs ergaenzen
  const coursesWithCount = await Promise.all(
    (courses ?? []).map(async (course) => {
      const { count } = await supabase
        .from("prevention_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", course.id);

      return { ...course, enrollment_count: count ?? 0 };
    }),
  );

  return NextResponse.json(coursesWithCount);
}
