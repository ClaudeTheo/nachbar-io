// modules/care/services/caregiver/caregiver-misc.service.ts
// Nachbar.io — Auto-Answer-Einstellungen und Chat-Konversation (Business Logic)

import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/care/audit";
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
  admin: SupabaseClient,
  userId: string,
  input: UpdateAutoAnswerInput,
): Promise<{ ok: true }> {
  const { linkId, autoAnswerAllowed, autoAnswerStart, autoAnswerEnd } = input;

  if (!linkId) {
    throw new ServiceError("linkId fehlt", 400);
  }

  // Auth-Client: Link muss aktiv sein und dem Angehoerigen gehoeren.
  const { data: link, error: linkError } = await supabase
    .from("caregiver_links")
    .select("id, resident_id")
    .eq("id", linkId)
    .eq("caregiver_id", userId)
    .is("revoked_at", null)
    .maybeSingle();

  if (linkError) {
    throw new ServiceError(
      "Link konnte nicht geprueft werden",
      500,
      "link_check_failed",
    );
  }

  if (!link) {
    throw new ServiceError("Link nicht gefunden", 404, "link_not_found");
  }

  const updatePayload: {
    auto_answer_allowed?: boolean;
    auto_answer_start?: string;
    auto_answer_end?: string;
  } = {};

  if (typeof autoAnswerAllowed === "boolean") {
    updatePayload.auto_answer_allowed = autoAnswerAllowed;
  }
  if (typeof autoAnswerStart === "string") {
    updatePayload.auto_answer_start = autoAnswerStart;
  }
  if (typeof autoAnswerEnd === "string") {
    updatePayload.auto_answer_end = autoAnswerEnd;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new ServiceError("Keine Aenderungen", 400, "no_update_fields");
  }

  // Admin-Client: RLS-Policy-Luecke umgehen, aber nur nach obigem Ownership-Check.
  const { data: updated, error } = await admin
    .from("caregiver_links")
    .update(updatePayload)
    .eq("id", linkId)
    .eq("caregiver_id", userId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    throw new ServiceError(
      "Update fehlgeschlagen",
      500,
      "auto_answer_update_failed",
    );
  }

  await writeAuditLog(admin, {
    seniorId: link.resident_id,
    actorId: userId,
    eventType: "auto_answer_settings_changed",
    referenceType: "caregiver_link",
    referenceId: linkId,
    metadata: { changedFields: Object.keys(updatePayload) },
  });

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
