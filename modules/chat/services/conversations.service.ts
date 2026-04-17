// Conversations-Service: 1:1-Chat zwischen zwei Kontakten (akzeptierte contact_links).

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string | null;
  created_at: string;
  quarter_id: string | null;
}

export interface ConversationWithPeer extends Conversation {
  peer_id: string;
}

/**
 * Normalisiert zwei User-IDs so, dass participant_1 < participant_2 (Check-Constraint).
 */
function orderParticipants(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * Liste aller 1:1-Konversationen des Users.
 * Sortiert nach last_message_at DESC (aktuellste zuerst).
 */
export async function listConversations(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConversationWithPeer[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      "id, participant_1, participant_2, last_message_at, created_at, quarter_id",
    )
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    throw new ServiceError(
      "Konversationen konnten nicht geladen werden",
      500,
      "list_conversations_failed",
      { details: error.message },
    );
  }

  return (data ?? []).map((row) => ({
    ...row,
    peer_id:
      row.participant_1 === userId ? row.participant_2 : row.participant_1,
  }));
}

/**
 * Konversation zu einem Peer holen oder neu anlegen (idempotent).
 * Voraussetzung via RLS: accepted contact_link zwischen beiden.
 */
export async function getOrCreateConversation(
  supabase: SupabaseClient,
  userId: string,
  peerId: string,
): Promise<Conversation> {
  if (userId === peerId) {
    throw new ServiceError(
      "Konversation mit sich selbst nicht moeglich",
      400,
      "self_conversation",
    );
  }

  const [p1, p2] = orderParticipants(userId, peerId);

  // Bestehende Konversation suchen
  const { data: existing } = await supabase
    .from("conversations")
    .select(
      "id, participant_1, participant_2, last_message_at, created_at, quarter_id",
    )
    .eq("participant_1", p1)
    .eq("participant_2", p2)
    .maybeSingle();

  if (existing) return existing;

  // Neu anlegen (RLS: nur wenn are_contacts(p1, p2) true)
  const { data, error } = await supabase
    .from("conversations")
    .insert({ participant_1: p1, participant_2: p2 })
    .select()
    .single();

  if (error) {
    if (
      error.code === "42501" ||
      error.message.toLowerCase().includes("policy")
    ) {
      throw new ServiceError(
        "Chat nur mit akzeptierten Kontakten moeglich",
        403,
        "no_accepted_contact",
      );
    }
    throw new ServiceError(
      "Konversation konnte nicht erstellt werden",
      500,
      "create_conversation_failed",
      { details: error.message },
    );
  }

  return data;
}

/**
 * Konversation loeschen (kaskadiert Nachrichten via FK).
 */
export async function deleteConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<void> {
  const { data: conv } = await supabase
    .from("conversations")
    .select("participant_1, participant_2")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) {
    throw new ServiceError("Konversation nicht gefunden", 404, "not_found");
  }
  if (conv.participant_1 !== userId && conv.participant_2 !== userId) {
    throw new ServiceError("Keine Berechtigung", 403, "not_participant");
  }

  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId);

  if (error) {
    throw new ServiceError(
      "Konversation konnte nicht geloescht werden",
      500,
      "delete_failed",
      { details: error.message },
    );
  }
}
