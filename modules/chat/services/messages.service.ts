// Messages-Service: 1:1-Nachrichten in direct_messages.
// Gruppen-Nachrichten liegen in chat-groups.service.ts.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";

export type MediaType = "image" | "audio";

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  media_type: MediaType | null;
  media_url: string | null;
  media_duration_sec: number | null;
  read_at: string | null;
  created_at: string;
}

export interface SendMessageInput {
  content?: string;
  media_type?: MediaType;
  media_url?: string;
  media_duration_sec?: number;
}

const MAX_CONTENT_LENGTH = 4000;
const MAX_AUDIO_DURATION_SEC = 60;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/**
 * Validiert Input: mindestens content ODER (media_url+media_type) gesetzt.
 */
function validateMessageInput(input: SendMessageInput): void {
  const hasContent = !!input.content && input.content.trim().length > 0;
  const hasMedia = !!input.media_url;

  if (!hasContent && !hasMedia) {
    throw new ServiceError(
      "Nachricht muss Text oder Medium enthalten",
      400,
      "empty_message",
    );
  }

  if (input.content && input.content.length > MAX_CONTENT_LENGTH) {
    throw new ServiceError(
      `Nachricht zu lang (max ${MAX_CONTENT_LENGTH} Zeichen)`,
      400,
      "content_too_long",
    );
  }

  if (hasMedia && !input.media_type) {
    throw new ServiceError(
      "media_type erforderlich bei Medien-Nachricht",
      400,
      "media_type_missing",
    );
  }

  if (input.media_type === "audio") {
    if (!input.media_duration_sec || input.media_duration_sec <= 0) {
      throw new ServiceError(
        "media_duration_sec erforderlich fuer Audio",
        400,
        "audio_duration_missing",
      );
    }
    if (input.media_duration_sec > MAX_AUDIO_DURATION_SEC) {
      throw new ServiceError(
        `Audio zu lang (max ${MAX_AUDIO_DURATION_SEC} Sekunden)`,
        400,
        "audio_too_long",
      );
    }
  }
}

/**
 * Liste der Nachrichten einer Konversation (pagination ueber before-cursor).
 * Sortiert nach created_at DESC (neueste zuerst — Chat rendert umgekehrt).
 */
export async function listMessages(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  options: { limit?: number; before?: string } = {},
): Promise<DirectMessage[]> {
  const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  // RLS-Check: ist User Teilnehmer?
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

  let query = supabase
    .from("direct_messages")
    .select(
      "id, conversation_id, sender_id, content, media_type, media_url, media_duration_sec, read_at, created_at",
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.before) {
    query = query.lt("created_at", options.before);
  }

  const { data, error } = await query;
  if (error) {
    throw new ServiceError(
      "Nachrichten konnten nicht geladen werden",
      500,
      "list_messages_failed",
      { details: error.message },
    );
  }

  return data ?? [];
}

/**
 * Nachricht senden. Aktualisiert last_message_at der Konversation.
 */
export async function sendMessage(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  input: SendMessageInput,
): Promise<DirectMessage> {
  validateMessageInput(input);

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

  const { data: message, error } = await supabase
    .from("direct_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: input.content?.trim() || null,
      media_type: input.media_type ?? null,
      media_url: input.media_url ?? null,
      media_duration_sec: input.media_duration_sec ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new ServiceError(
      "Nachricht konnte nicht gesendet werden",
      500,
      "send_message_failed",
      { details: error.message },
    );
  }

  // last_message_at aktualisieren (fire-and-forget — Fehler nur loggen)
  await supabase
    .from("conversations")
    .update({ last_message_at: message.created_at })
    .eq("id", conversationId);

  return message;
}

/**
 * Nachrichten als gelesen markieren (bulk).
 */
export async function markMessagesRead(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<number> {
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

  const { count, error } = await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() }, { count: "exact" })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);

  if (error) {
    throw new ServiceError(
      "Nachrichten konnten nicht als gelesen markiert werden",
      500,
      "mark_read_failed",
      { details: error.message },
    );
  }

  return count ?? 0;
}
