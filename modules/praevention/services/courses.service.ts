// Praevention — Kurse Service
// CRUD-Operationen fuer prevention_courses

import { createClient } from "@/lib/supabase/server";

// Typen
export interface PreventionCourse {
  id: string;
  title: string;
  description: string | null;
  instructor_id: string;
  quarter_id: string | null;
  starts_at: string;
  ends_at: string;
  max_participants: number;
  status: "planned" | "active" | "completed" | "cancelled";
  created_at: string;
  instructor?: { display_name: string; avatar_url: string | null };
  enrollment_count?: number;
}

export interface CreateCourseParams {
  title: string;
  description?: string;
  instructorId: string;
  quarterId?: string;
  startsAt: string;
  endsAt: string;
  maxParticipants?: number;
}

const COURSE_SELECT = `
  *,
  instructor:users!prevention_courses_instructor_id_fkey(display_name, avatar_url)
`;

// Alle Kurse eines Quartiers laden
export async function getCoursesByQuarter(
  quarterId: string,
): Promise<PreventionCourse[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_courses")
    .select(COURSE_SELECT)
    .eq("quarter_id", quarterId)
    .in("status", ["planned", "active"])
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as PreventionCourse[];
}

// Alle verfuegbaren Kurse laden (quarteruebergreifend)
export async function getAvailableCourses(): Promise<PreventionCourse[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_courses")
    .select(COURSE_SELECT)
    .in("status", ["planned", "active"])
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as PreventionCourse[];
}

// Einzelnen Kurs laden
export async function getCourseById(
  courseId: string,
): Promise<PreventionCourse | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_courses")
    .select(COURSE_SELECT)
    .eq("id", courseId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as unknown as PreventionCourse;
}

// Kurs erstellen (nur Kursleiter)
export async function createCourse(
  params: CreateCourseParams,
): Promise<PreventionCourse> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_courses")
    .insert({
      title: params.title,
      description: params.description ?? null,
      instructor_id: params.instructorId,
      quarter_id: params.quarterId ?? null,
      starts_at: params.startsAt,
      ends_at: params.endsAt,
      max_participants: params.maxParticipants ?? 15,
    })
    .select(COURSE_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as PreventionCourse;
}

// Kurs-Status aendern (nur Kursleiter)
export async function updateCourseStatus(
  courseId: string,
  status: PreventionCourse["status"],
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prevention_courses")
    .update({ status })
    .eq("id", courseId);

  if (error) throw error;
}

// Teilnehmerzahl fuer einen Kurs zaehlen
export async function getCourseEnrollmentCount(
  courseId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("prevention_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  if (error) throw error;
  return count ?? 0;
}

// Kurse eines Kursleiters laden
export async function getCoursesByInstructor(
  instructorId: string,
): Promise<PreventionCourse[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_courses")
    .select(COURSE_SELECT)
    .eq("instructor_id", instructorId)
    .order("starts_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as PreventionCourse[];
}
