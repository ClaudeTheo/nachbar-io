// GET /api/prevention/progress — Eigener Kurs-Fortschritt
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateCurrentWeek } from "@/modules/praevention/services/sessions.service";

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

  // Enrollment laden
  let enrollmentQuery = supabase
    .from("prevention_enrollments")
    .select(
      `
      *,
      course:prevention_courses(id, title, starts_at, ends_at, status, instructor:users!prevention_courses_instructor_id_fkey(display_name))
    `,
    )
    .eq("user_id", user.id);

  if (courseId) {
    enrollmentQuery = enrollmentQuery.eq("course_id", courseId);
  }

  const { data: enrollments, error: enrollError } = await enrollmentQuery.order(
    "enrolled_at",
    { ascending: false },
  );

  if (enrollError) {
    console.error("Fortschritt laden fehlgeschlagen:", enrollError);
    return NextResponse.json(
      { error: "Fortschritt konnte nicht geladen werden" },
      { status: 500 },
    );
  }

  if (!enrollments || enrollments.length === 0) {
    return NextResponse.json([]);
  }

  // Fuer jede Einschreibung: Sessions + Fortschritt berechnen
  const progressData = await Promise.all(
    enrollments.map(async (enrollment) => {
      const { data: sessions } = await supabase
        .from("prevention_sessions")
        .select("*")
        .eq("enrollment_id", enrollment.id)
        .order("started_at", { ascending: true });

      const allSessions = sessions ?? [];
      const completedDaily = allSessions.filter(
        (s) => s.session_type === "daily_mini" && s.completed_at,
      ).length;
      const completedWeekly = allSessions.filter(
        (s) => s.session_type === "weekly_main" && s.completed_at,
      ).length;

      const course = enrollment.course as { starts_at: string } | null;
      const currentWeek = course ? calculateCurrentWeek(course.starts_at) : 1;

      // Wochen-Details
      const weeks = [];
      for (let w = 1; w <= 8; w++) {
        const weekSessions = allSessions.filter((s) => s.week_number === w);
        weeks.push({
          week: w,
          dailyCompleted: weekSessions.filter(
            (s) => s.session_type === "daily_mini" && s.completed_at,
          ).length,
          weeklyCompleted: weekSessions.some(
            (s) => s.session_type === "weekly_main" && s.completed_at,
          ),
        });
      }

      return {
        enrollment,
        currentWeek,
        completedDaily,
        completedWeekly,
        totalSessions: allSessions.length,
        weeks,
      };
    }),
  );

  return NextResponse.json(progressData);
}
