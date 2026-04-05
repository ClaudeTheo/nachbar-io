// Praevention — Sichtbarkeits-Einwilligung Service
// Bewohner kann Angehoerigen/Pflege erlauben, Kurs-Status zu sehen
// Datenprinzip: Status sehen, NICHT Inhalt (DSGVO Art. 6 Abs. 1a)

import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export type ViewerType = "caregiver" | "org_member";

export interface VisibilityConsent {
  id: string;
  enrollment_id: string;
  user_id: string;
  viewer_type: ViewerType;
  granted_at: string;
  revoked_at: string | null;
}

// Einwilligung erteilen
export async function grantVisibility(
  userId: string,
  enrollmentId: string,
  viewerType: ViewerType,
): Promise<VisibilityConsent> {
  const supabase = await createClient();

  // Pruefen ob bereits existiert (ggf. revoked)
  const { data: existing } = await supabase
    .from("prevention_visibility_consent")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .eq("user_id", userId)
    .eq("viewer_type", viewerType)
    .maybeSingle();

  if (existing) {
    // Wiederaktivieren falls widerrufen
    if (existing.revoked_at) {
      const { data, error } = await supabase
        .from("prevention_visibility_consent")
        .update({ revoked_at: null, granted_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return data as VisibilityConsent;
    }
    return existing as VisibilityConsent;
  }

  const { data, error } = await supabase
    .from("prevention_visibility_consent")
    .insert({
      enrollment_id: enrollmentId,
      user_id: userId,
      viewer_type: viewerType,
    })
    .select()
    .single();

  if (error) throw error;
  return data as VisibilityConsent;
}

// Einwilligung widerrufen
export async function revokeVisibility(
  userId: string,
  enrollmentId: string,
  viewerType: ViewerType,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prevention_visibility_consent")
    .update({ revoked_at: new Date().toISOString() })
    .eq("enrollment_id", enrollmentId)
    .eq("user_id", userId)
    .eq("viewer_type", viewerType);

  if (error) throw error;
}

// Pruefen ob Sichtbarkeit gewaehrt ist
export async function checkVisibility(
  userId: string,
  enrollmentId: string,
  viewerType: ViewerType,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prevention_visibility_consent")
    .select("id")
    .eq("enrollment_id", enrollmentId)
    .eq("user_id", userId)
    .eq("viewer_type", viewerType)
    .is("revoked_at", null)
    .maybeSingle();

  return !!data;
}

// Meine Einwilligungen laden
export async function getMyVisibilityConsents(
  userId: string,
): Promise<VisibilityConsent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_visibility_consent")
    .select("*")
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) throw error;
  return (data ?? []) as VisibilityConsent[];
}

// Praevention-Status fuer Angehoerige/Pflege abfragen
// Gibt NUR Status + Zeitstempel zurueck, NICHT Inhalte
export async function getCaregiverPreventionStatus(
  caregiverId: string,
): Promise<
  {
    residentName: string;
    courseTitle: string;
    currentWeek: number;
    lastSessionAt: string | null;
    attendanceRate: number | null;
    completed: boolean;
  }[]
> {
  const adminDb = getAdminSupabase();

  // Verknuepfte Bewohner des Caregivers
  const { data: links } = await adminDb
    .from("caregiver_links")
    .select("resident_id")
    .eq("caregiver_id", caregiverId)
    .is("revoked_at", null);

  if (!links || links.length === 0) return [];

  const residentIds = links.map((l) => l.resident_id);

  // Enrollments der Bewohner laden (nur wenn Sichtbarkeit gewaehrt)
  const { data: enrollments } = await adminDb
    .from("prevention_enrollments")
    .select(
      `
      id, user_id, attendance_rate, completed_at,
      course:prevention_courses(title, starts_at),
      user:users!prevention_enrollments_user_id_fkey(display_name)
    `,
    )
    .in("user_id", residentIds);

  if (!enrollments || enrollments.length === 0) return [];

  // Nur Enrollments mit aktiver Sichtbarkeits-Einwilligung
  const { data: consents } = await adminDb
    .from("prevention_visibility_consent")
    .select("enrollment_id")
    .in(
      "enrollment_id",
      enrollments.map((e) => e.id),
    )
    .eq("viewer_type", "caregiver")
    .is("revoked_at", null);

  const consentedIds = new Set((consents ?? []).map((c) => c.enrollment_id));

  const results = [];

  for (const e of enrollments) {
    if (!consentedIds.has(e.id)) continue;

    // Letzte Session laden
    const { data: lastSession } = await adminDb
      .from("prevention_sessions")
      .select("completed_at")
      .eq("enrollment_id", e.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Aktuelle Woche berechnen
    const courseStart = (e.course as unknown as { starts_at: string })
      ?.starts_at;
    const weeksSinceStart = courseStart
      ? Math.ceil(
          (Date.now() - new Date(courseStart).getTime()) /
            (7 * 24 * 60 * 60 * 1000),
        )
      : 1;

    results.push({
      residentName:
        (e.user as unknown as { display_name: string })?.display_name ||
        "Bewohner",
      courseTitle:
        (e.course as unknown as { title: string })?.title || "Präventionskurs",
      currentWeek: Math.min(Math.max(weeksSinceStart, 1), 8),
      lastSessionAt: lastSession?.completed_at || null,
      attendanceRate: e.attendance_rate,
      completed: !!e.completed_at,
    });
  }

  return results;
}
