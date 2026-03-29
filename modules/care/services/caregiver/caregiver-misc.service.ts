// modules/care/services/caregiver/caregiver-misc.service.ts
// Nachbar.io — Auto-Answer-Einstellungen und Chat-Konversation (Business Logic)

import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";

// ---------- getAutoAnswerSettings ----------

export interface AutoAnswerSettings {
  auto_answer_allowed: boolean;
  auto_answer_start: string | null;
  auto_answer_end: string | null;
}

export async function getAutoAnswerSettings(
  supabase: SupabaseClient,
  userId: string,
  linkId: string,
): Promise<AutoAnswerSettings> {
  if (!linkId) {
    throw new ServiceError("linkId fehlt", 400);
  }

  const { data, error } = await supabase
    .from("caregiver_links")
    .select("auto_answer_allowed, auto_answer_start, auto_answer_end")
    .eq("id", linkId)
    .eq("caregiver_id", userId)
    .is("revoked_at", null)
    .single();

  if (error || !data) {
    throw new ServiceError("Link nicht gefunden", 404);
  }

  return data as AutoAnswerSettings;
}

// ---------- updateAutoAnswerSettings ----------

export interface UpdateAutoAnswerInput {
  linkId: string;
  autoAnswerAllowed?: boolean;
  autoAnswerStart?: string;
  autoAnswerEnd?: string;
}

export async function updateAutoAnswerSettings(
  supabase: SupabaseClient,
  userId: string,
  input: UpdateAutoAnswerInput,
): Promise<{ ok: true }> {
  const { linkId, autoAnswerAllowed, autoAnswerStart, autoAnswerEnd } = input;

  if (!linkId) {
    throw new ServiceError("linkId fehlt", 400);
  }

  const { error } = await supabase
    .from("caregiver_links")
    .update({
      auto_answer_allowed: autoAnswerAllowed,
      auto_answer_start: autoAnswerStart,
      auto_answer_end: autoAnswerEnd,
    })
    .eq("id", linkId)
    .eq("caregiver_id", userId)
    .is("revoked_at", null);

  if (error) {
    throw new ServiceError("Update fehlgeschlagen", 500);
  }

  return { ok: true };
}

// ---------- findOrCreateConversation ----------

export interface ConversationResult {
  conversation_id: string;
  created: boolean;
}

export async function findOrCreateConversation(
  supabase: SupabaseClient,
  userId: string,
  residentId: string,
): Promise<ConversationResult> {
  if (!residentId) {
    throw new ServiceError("resident_id erforderlich", 400);
  }

  // Caregiver-Link pruefen (aktiv = nicht widerrufen)
  const { data: link, error: linkError } = await supabase
    .from("caregiver_links")
    .select("id")
    .eq("caregiver_id", userId)
    .eq("resident_id", residentId)
    .is("revoked_at", null)
    .single();

  if (linkError || !link) {
    throw new ServiceError("Keine aktive Verknüpfung mit diesem Bewohner", 403);
  }

  // Bestehende Konversation suchen
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(
      `and(participant_1.eq.${userId},participant_2.eq.${residentId}),` +
        `and(participant_1.eq.${residentId},participant_2.eq.${userId})`,
    )
    .single();

  if (existing) {
    return { conversation_id: existing.id, created: false };
  }

  // Neue Konversation erstellen
  const { data: newConv, error: convError } = await supabase
    .from("conversations")
    .insert({
      participant_1: userId,
      participant_2: residentId,
    })
    .select("id")
    .single();

  if (convError) {
    console.error(
      "[caregiver/chat] Konversation erstellen:",
      convError.message,
    );
    throw new ServiceError("Konversation konnte nicht erstellt werden", 500);
  }

  return { conversation_id: newConv.id, created: true };
}
