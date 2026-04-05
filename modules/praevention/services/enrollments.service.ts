// Praevention — Einschreibungs-Service
// CRUD fuer prevention_enrollments + Attendance-Berechnung

import { createClient } from "@/lib/supabase/server";

export interface PreventionEnrollment {
  id: string;
  course_id: string;
  user_id: string;
  enrolled_at: string;
  completed_at: string | null;
  certificate_generated: boolean;
  attendance_rate: number | null;
  pre_pss10_score: number | null;
  post_pss10_score: number | null;
  payer_type: "self" | "caregiver" | "organization" | "pilot_free";
  payer_user_id: string | null;
  insurance_provider: string | null;
  insurance_config_id: string | null;
  reimbursement_started_at: string | null;
  reimbursement_submitted_at: string | null;
  reimbursement_confirmed_at: string | null;
  course?: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    status: string;
    instructor: { display_name: string } | null;
  };
}

export interface EnrollParams {
  courseId: string;
  userId: string;
  payerType?: "self" | "caregiver" | "organization" | "pilot_free";
  payerUserId?: string;
  payerName?: string;
  payerEmail?: string;
  insuranceProvider?: string;
  insuranceConfigId?: string;
}

const ENROLLMENT_SELECT = `
  *,
  course:prevention_courses(id, title, starts_at, ends_at, status, instructor:users!prevention_courses_instructor_id_fkey(display_name))
`;

// In Kurs einschreiben
export async function enrollInCourse(
  params: EnrollParams,
): Promise<PreventionEnrollment> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_enrollments")
    .insert({
      course_id: params.courseId,
      user_id: params.userId,
      payer_type: params.payerType ?? "pilot_free",
      payer_user_id: params.payerUserId ?? null,
      payer_name: params.payerName ?? null,
      payer_email: params.payerEmail ?? null,
      insurance_provider: params.insuranceProvider ?? null,
      insurance_config_id: params.insuranceConfigId ?? null,
    })
    .select(ENROLLMENT_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as PreventionEnrollment;
}

// Eigene Einschreibung fuer einen Kurs laden
export async function getMyEnrollment(
  userId: string,
  courseId: string,
): Promise<PreventionEnrollment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_enrollments")
    .select(ENROLLMENT_SELECT)
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as PreventionEnrollment | null;
}

// Alle Einschreibungen eines Nutzers
export async function getMyEnrollments(
  userId: string,
): Promise<PreventionEnrollment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_enrollments")
    .select(ENROLLMENT_SELECT)
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as PreventionEnrollment[];
}

// Alle Teilnehmer eines Kurses (fuer Kursleiter)
export async function getEnrollmentsByCourse(
  courseId: string,
): Promise<PreventionEnrollment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_enrollments")
    .select(
      `
      *,
      user:users!prevention_enrollments_user_id_fkey(display_name, avatar_url)
    `,
    )
    .eq("course_id", courseId)
    .order("enrolled_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as PreventionEnrollment[];
}

// Enrollment aktualisieren
export async function updateEnrollment(
  enrollmentId: string,
  updates: Partial<{
    completed_at: string;
    certificate_generated: boolean;
    certificate_id: string;
    certificate_issued_by: string;
    certificate_issued_at: string;
    attendance_rate: number;
    pre_pss10_score: number;
    pre_pss10_completed_at: string;
    post_pss10_score: number;
    post_pss10_completed_at: string;
    reimbursement_started_at: string;
    reimbursement_submitted_at: string;
    reimbursement_method: string;
    reimbursement_confirmed_at: string;
    reimbursement_reminder_enabled: boolean;
  }>,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prevention_enrollments")
    .update(updates)
    .eq("id", enrollmentId);

  if (error) throw error;
}

// Anwesenheitsrate berechnen (completed sessions / expected sessions)
export async function calculateAttendanceRate(
  enrollmentId: string,
): Promise<number> {
  const supabase = await createClient();

  // Abgeschlossene Sitzungen zaehlen
  const { count: completedCount, error: countError } = await supabase
    .from("prevention_sessions")
    .select("id", { count: "exact", head: true })
    .eq("enrollment_id", enrollmentId)
    .not("completed_at", "is", null);

  if (countError) throw countError;

  // Erwartete Sitzungen: 8 Wochen-Hauptsitzungen + 56 taegliche Mini-Sitzungen (8*7)
  const expectedTotal = 8 + 56;
  const rate = ((completedCount ?? 0) / expectedTotal) * 100;

  // Attendance-Rate in enrollment speichern
  await updateEnrollment(enrollmentId, {
    attendance_rate: Math.round(rate * 100) / 100,
  });

  return rate;
}
