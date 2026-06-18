// lib/video-calls/incoming-auto-answer.ts (Welle AA-4)
// Entscheidet client-seitig, ob ein eingehender Anruf in der Senior-Shell
// automatisch angenommen werden soll. Liest den caregiver_link zwischen Senior
// (resident) und Anrufer (caregiver) via RLS — der resident darf seine eigenen
// Links lesen, daher KEINE neue API-Fläche nötig — und delegiert die
// Entscheidung an shouldAutoAnswer (eine Wahrheit, inkl. Senior-Consent-Gate).

import type { SupabaseClient } from "@supabase/supabase-js";
import { shouldAutoAnswer, type AutoAnswerContact } from "./auto-answer";

// Quiet Hours sind in der Senior-Shell (noch) nicht konfigurierbar -> aus.
// Das Kontakt-Zeitfenster (auto_answer_start/_end) gated bereits.
const QUIET_HOURS_OFF = { enabled: false, start: "22:00", end: "07:00" };

// time-Spalten kommen als "HH:MM:SS" -> auf "HH:MM" normalisieren.
function hhmm(value: unknown): string {
  return typeof value === "string" ? value.slice(0, 5) : "";
}

/**
 * Liest den aktiven Link Senior->Anrufer und entscheidet via shouldAutoAnswer.
 * Gibt false zurück, wenn keine aktive Verbindung besteht.
 */
export async function shouldAutoAnswerIncomingCall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  residentUserId: string,
  callerId: string,
  currentTime: string, // HH:MM
): Promise<boolean> {
  const { data: link } = await supabase
    .from("caregiver_links")
    .select(
      "auto_answer_allowed, auto_answer_start, auto_answer_end, auto_answer_senior_consented_at, revoked_at",
    )
    .eq("resident_id", residentUserId)
    .eq("caregiver_id", callerId)
    .is("revoked_at", null)
    .maybeSingle();

  if (!link) return false;

  const contact: AutoAnswerContact = {
    autoAnswerAllowed: Boolean(link.auto_answer_allowed),
    autoAnswerStart: hhmm(link.auto_answer_start) || "00:00",
    autoAnswerEnd: hhmm(link.auto_answer_end) || "23:59",
    revokedAt: link.revoked_at ?? null,
    seniorConsentedAt: link.auto_answer_senior_consented_at ?? null,
  };

  return shouldAutoAnswer(contact, QUIET_HOURS_OFF, currentTime);
}
