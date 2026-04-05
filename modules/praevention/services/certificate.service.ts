// Praevention — Zertifikat-Service
// Generiert ZPP-konforme Teilnahmebescheinigung als PDF
// Design-Ref: docs/plans/2026-04-05-praevention-aktiv-im-quartier-design.md

import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export interface CertificateData {
  participantName: string;
  courseTitle: string;
  coursePeriod: string;
  totalSessions: number;
  completedSessions: number;
  attendanceRate: number;
  instructorName: string;
  instructorQualification: string;
  certificateId: string;
  issuedAt: string;
  zppId: string;
}

/** Zertifikat-Daten zusammenstellen und in DB speichern */
export async function prepareCertificate(
  enrollmentId: string,
): Promise<CertificateData> {
  const supabase = await createClient();

  // Enrollment mit Kurs und User laden
  const { data: enrollment, error } = await supabase
    .from("prevention_enrollments")
    .select(
      `
      id,
      user_id,
      course_id,
      attendance_rate,
      certificate_id,
      certificate_generated,
      prevention_courses!inner (
        title,
        starts_at,
        ends_at,
        instructor_id
      )
    `,
    )
    .eq("id", enrollmentId)
    .single();

  if (error || !enrollment) {
    throw new Error("Einschreibung nicht gefunden");
  }

  const course = (enrollment as Record<string, unknown>)
    .prevention_courses as Record<string, unknown>;

  // Teilnehmer-Name
  const { data: user } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", enrollment.user_id)
    .single();

  // Kursleiter-Name
  const { data: instructor } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", course.instructor_id as string)
    .single();

  // Sitzungen zaehlen
  const { count: completedCount } = await supabase
    .from("prevention_sessions")
    .select("*", { count: "exact", head: true })
    .eq("enrollment_id", enrollmentId)
    .not("completed_at", "is", null);

  // Anwesenheitsrate berechnen (oder aus DB nehmen)
  const totalSessions = 8 * 7 + 8; // 7 daily + 1 weekly pro Woche
  const completed = completedCount ?? 0;
  const rate = enrollment.attendance_rate ?? (completed / totalSessions) * 100;

  if (rate < 80) {
    throw new Error("Mindestens 80% Anwesenheit erforderlich");
  }

  // Zertifikat-ID generieren oder vorhandene verwenden
  const certId =
    enrollment.certificate_id ??
    `AiQ-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  // In DB speichern
  await supabase
    .from("prevention_enrollments")
    .update({
      certificate_generated: true,
      certificate_id: certId,
      completed_at: enrollment.certificate_generated ? undefined : now,
    })
    .eq("id", enrollmentId);

  const startsAt = new Date(course.starts_at as string);
  const endsAt = new Date(course.ends_at as string);

  return {
    participantName: user?.display_name ?? "Teilnehmer",
    courseTitle: (course.title as string) ?? "Aktiv im Quartier",
    coursePeriod: `${startsAt.toLocaleDateString("de-DE")} – ${endsAt.toLocaleDateString("de-DE")}`,
    totalSessions,
    completedSessions: completed,
    attendanceRate: Math.round(rate),
    instructorName: instructor?.display_name ?? "Kursleitung",
    instructorQualification: "Zertifizierte Kursleitung (§ 20 SGB V)",
    certificateId: certId,
    issuedAt: new Date(now).toLocaleDateString("de-DE"),
    zppId: "wird nach ZPP-Zertifizierung vergeben",
  };
}
