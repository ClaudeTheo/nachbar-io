// Praevention — Dashboard-Service (Kursleiter-Ansicht)
// Aggregierte Daten fuer das Kursleiter-Dashboard

import { createClient } from "@/lib/supabase/server";

export interface DashboardOverview {
  totalParticipants: number;
  activeThisWeek: number;
  warnings: WarningItem[];
  nextCall: NextCallInfo | null;
  aggregatedMood: { before: number; after: number } | null;
  courseId: string;
  courseTitle: string;
}

export interface WarningItem {
  userId: string;
  displayName: string;
  lastActivity: string | null;
  daysSinceActive: number;
}

export interface NextCallInfo {
  scheduledAt: string;
  weekNumber: number;
}

export interface ParticipantDetail {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  enrolledAt: string;
  attendanceRate: number | null;
  lastActivity: string | null;
  completedDaily: number;
  completedWeekly: number;
  moodTrend: "up" | "down" | "stable" | "unknown";
  status: "active" | "inactive" | "warning";
}

// Kursleiter-Dashboard laden
export async function getDashboardOverview(
  instructorId: string,
): Promise<DashboardOverview | null> {
  const supabase = await createClient();

  // Kurs des Kursleiters finden
  const { data: course, error: courseError } = await supabase
    .from("prevention_courses")
    .select("id, title")
    .eq("instructor_id", instructorId)
    .in("status", ["active", "planned"])
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (courseError || !course) return null;

  // Teilnehmer zaehlen
  const { count: totalParticipants } = await supabase
    .from("prevention_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", course.id);

  // Aktive diese Woche (Sitzung in letzten 7 Tagen)
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: recentSessions } = await supabase
    .from("prevention_sessions")
    .select("enrollment_id")
    .gte("started_at", sevenDaysAgo)
    .in(
      "enrollment_id",
      // Sub-Query: Enrollments dieses Kurses
      (
        await supabase
          .from("prevention_enrollments")
          .select("id")
          .eq("course_id", course.id)
      ).data?.map((e) => e.id) ?? [],
    );

  const activeIds = new Set((recentSessions ?? []).map((s) => s.enrollment_id));

  // Warnungen: >7 Tage inaktiv
  const { data: enrollments } = await supabase
    .from("prevention_enrollments")
    .select(
      "id, user_id, user:users!prevention_enrollments_user_id_fkey(display_name)",
    )
    .eq("course_id", course.id);

  const warnings: WarningItem[] = [];
  for (const enrollment of enrollments ?? []) {
    if (!activeIds.has(enrollment.id)) {
      const { data: lastSession } = await supabase
        .from("prevention_sessions")
        .select("started_at")
        .eq("enrollment_id", enrollment.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastActivity = lastSession?.started_at ?? null;
      const daysSince = lastActivity
        ? Math.floor(
            (Date.now() - new Date(lastActivity).getTime()) /
              (24 * 60 * 60 * 1000),
          )
        : 999;

      if (daysSince > 7) {
        const user = enrollment.user as { display_name: string } | null;
        warnings.push({
          userId: enrollment.user_id,
          displayName: user?.display_name ?? "Unbekannt",
          lastActivity,
          daysSinceActive: daysSince,
        });
      }
    }
  }

  // Naechster Gruppen-Call
  const { data: nextCallData } = await supabase
    .from("prevention_group_calls")
    .select("scheduled_at, week_number")
    .eq("course_id", course.id)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const nextCall = nextCallData
    ? {
        scheduledAt: nextCallData.scheduled_at,
        weekNumber: nextCallData.week_number,
      }
    : null;

  // Aggregierte Stimmung (Durchschnitt aller Sitzungen diese Woche)
  const { data: moodData } = await supabase
    .from("prevention_sessions")
    .select("mood_before, mood_after")
    .gte("started_at", sevenDaysAgo)
    .not("mood_before", "is", null)
    .not("mood_after", "is", null);

  let aggregatedMood: { before: number; after: number } | null = null;
  if (moodData && moodData.length > 0) {
    const sumBefore = moodData.reduce((s, m) => s + (m.mood_before ?? 0), 0);
    const sumAfter = moodData.reduce((s, m) => s + (m.mood_after ?? 0), 0);
    aggregatedMood = {
      before: Math.round((sumBefore / moodData.length) * 10) / 10,
      after: Math.round((sumAfter / moodData.length) * 10) / 10,
    };
  }

  return {
    totalParticipants: totalParticipants ?? 0,
    activeThisWeek: activeIds.size,
    warnings,
    nextCall,
    aggregatedMood,
    courseId: course.id,
    courseTitle: course.title,
  };
}

// Teilnehmer-Detail-Liste
export async function getParticipantDetails(
  courseId: string,
): Promise<ParticipantDetail[]> {
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("prevention_enrollments")
    .select(
      "*, user:users!prevention_enrollments_user_id_fkey(display_name, avatar_url)",
    )
    .eq("course_id", courseId)
    .order("enrolled_at", { ascending: true });

  if (!enrollments) return [];

  const details: ParticipantDetail[] = [];

  for (const enrollment of enrollments) {
    const user = enrollment.user as {
      display_name: string;
      avatar_url: string | null;
    } | null;

    // Sitzungen laden
    const { data: sessions } = await supabase
      .from("prevention_sessions")
      .select("*")
      .eq("enrollment_id", enrollment.id)
      .order("started_at", { ascending: false });

    const allSessions = sessions ?? [];
    const lastSession = allSessions[0];
    const completedDaily = allSessions.filter(
      (s) => s.session_type === "daily_mini" && s.completed_at,
    ).length;
    const completedWeekly = allSessions.filter(
      (s) => s.session_type === "weekly_main" && s.completed_at,
    ).length;

    // Stimmungs-Trend (letzte 5 Sitzungen)
    const recentMoods = allSessions
      .filter((s) => s.mood_after != null)
      .slice(0, 5)
      .map((s) => s.mood_after!);

    let moodTrend: "up" | "down" | "stable" | "unknown" = "unknown";
    if (recentMoods.length >= 3) {
      const first = recentMoods[recentMoods.length - 1];
      const last = recentMoods[0];
      if (last > first) moodTrend = "up";
      else if (last < first) moodTrend = "down";
      else moodTrend = "stable";
    }

    // Status
    const daysSinceActive = lastSession
      ? Math.floor(
          (Date.now() - new Date(lastSession.started_at).getTime()) /
            (24 * 60 * 60 * 1000),
        )
      : 999;

    let status: "active" | "inactive" | "warning" = "active";
    if (daysSinceActive > 14) status = "inactive";
    else if (daysSinceActive > 7) status = "warning";

    details.push({
      userId: enrollment.user_id,
      displayName: user?.display_name ?? "Unbekannt",
      avatarUrl: user?.avatar_url ?? null,
      enrolledAt: enrollment.enrolled_at,
      attendanceRate: enrollment.attendance_rate,
      lastActivity: lastSession?.started_at ?? null,
      completedDaily,
      completedWeekly,
      moodTrend,
      status,
    });
  }

  return details;
}
