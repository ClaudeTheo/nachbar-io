// Praevention — Sitzungs-Service
// Tracking fuer taegliche Mini-Sitzungen und woechentliche Hauptsitzungen

import { createClient } from "@/lib/supabase/server";

export interface PreventionSession {
  id: string;
  enrollment_id: string;
  week_number: number;
  day_of_week: number | null;
  session_type: "daily_mini" | "weekly_main";
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  instructor_present: boolean;
  mood_before: number | null;
  mood_after: number | null;
  voice_consent_given: boolean;
  escalation_flag:
    | "normal"
    | "abbruch_freiwillig"
    | "belastung_erkannt"
    | "abgebrochen_eskalation";
}

export interface StartSessionParams {
  enrollmentId: string;
  weekNumber: number;
  dayOfWeek?: number;
  sessionType: "daily_mini" | "weekly_main";
  voiceConsentGiven?: boolean;
}

export interface CompleteSessionParams {
  sessionId: string;
  durationSeconds: number;
  moodBefore?: number;
  moodAfter?: number;
  escalationFlag?: PreventionSession["escalation_flag"];
}

// Sitzung starten
export async function startSession(
  params: StartSessionParams,
): Promise<PreventionSession> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_sessions")
    .insert({
      enrollment_id: params.enrollmentId,
      week_number: params.weekNumber,
      day_of_week: params.dayOfWeek ?? null,
      session_type: params.sessionType,
      voice_consent_given: params.voiceConsentGiven ?? false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PreventionSession;
}

// Sitzung abschliessen
export async function completeSession(
  params: CompleteSessionParams,
): Promise<PreventionSession> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_sessions")
    .update({
      completed_at: new Date().toISOString(),
      duration_seconds: params.durationSeconds,
      mood_before: params.moodBefore ?? null,
      mood_after: params.moodAfter ?? null,
      escalation_flag: params.escalationFlag ?? "normal",
    })
    .eq("id", params.sessionId)
    .select()
    .single();

  if (error) throw error;
  return data as PreventionSession;
}

// Alle Sitzungen einer Einschreibung
export async function getSessionsByEnrollment(
  enrollmentId: string,
): Promise<PreventionSession[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_sessions")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .order("started_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PreventionSession[];
}

// Wochen-Fortschritt: Wie viele Sitzungen in einer bestimmten Woche abgeschlossen?
export interface WeekProgress {
  weekNumber: number;
  dailyCompleted: number;
  dailyTotal: number; // 7 pro Woche
  weeklyMainCompleted: boolean;
  moodTrend: { before: number; after: number }[];
}

export async function getWeekProgress(
  enrollmentId: string,
  weekNumber: number,
): Promise<WeekProgress> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_sessions")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .eq("week_number", weekNumber);

  if (error) throw error;

  const sessions = (data ?? []) as PreventionSession[];
  const dailySessions = sessions.filter(
    (s) => s.session_type === "daily_mini" && s.completed_at,
  );
  const weeklyMain = sessions.find(
    (s) => s.session_type === "weekly_main" && s.completed_at,
  );

  const moodTrend = sessions
    .filter((s) => s.mood_before != null && s.mood_after != null)
    .map((s) => ({ before: s.mood_before!, after: s.mood_after! }));

  return {
    weekNumber,
    dailyCompleted: dailySessions.length,
    dailyTotal: 7,
    weeklyMainCompleted: !!weeklyMain,
    moodTrend,
  };
}

// Gesamt-Fortschritt: Alle 8 Wochen
export async function getOverallProgress(
  enrollmentId: string,
): Promise<WeekProgress[]> {
  const progress: WeekProgress[] = [];
  for (let week = 1; week <= 8; week++) {
    progress.push(await getWeekProgress(enrollmentId, week));
  }
  return progress;
}

// Aktuelle Woche des Kurses berechnen (basierend auf Startdatum)
export function calculateCurrentWeek(courseStartsAt: string): number {
  const start = new Date(courseStartsAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(Math.max(diffWeeks, 1), 8);
}
