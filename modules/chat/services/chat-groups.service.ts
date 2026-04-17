// Chat-Groups-Service: Gruppen-Chat bis 10 Mitglieder
// (chat_groups, chat_group_members, chat_group_messages — Mig 161+Fix)

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import type { MediaType } from "./messages.service";

export interface ChatGroup {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  last_message_at: string | null;
}

export interface ChatGroupMember {
  group_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  last_read_at: string | null;
}

export interface ChatGroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string | null;
  media_type: MediaType | null;
  media_url: string | null;
  media_duration_sec: number | null;
  created_at: string;
}

const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_CONTENT_LENGTH = 4000;
const MAX_AUDIO_DURATION_SEC = 60;
const MAX_GROUP_MEMBERS = 10;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// ============================================================
// Gruppen-Management
// ============================================================

export async function listMyGroups(
  supabase: SupabaseClient,
  userId: string,
): Promise<ChatGroup[]> {
  const { data, error } = await supabase
    .from("chat_group_members")
    .select(
      "chat_groups(id, name, description, created_by, created_at, last_message_at)",
    )
    .eq("user_id", userId);

  if (error) {
    throw new ServiceError(
      "Gruppen konnten nicht geladen werden",
      500,
      "list_groups_failed",
      { details: error.message },
    );
  }

  // Supabase-generierte Types modellieren nested joins konservativ als Array,
  // obwohl der FK eine 1:1-Beziehung darstellt. Daher unknown-Cast.
  const groups = (data ?? []).flatMap((row) => {
    const joined = (
      row as unknown as { chat_groups: ChatGroup | ChatGroup[] | null }
    ).chat_groups;
    if (!joined) return [];
    return Array.isArray(joined) ? joined : [joined];
  });

  return groups.sort((a, b) => {
    const aTs = a.last_message_at ? Date.parse(a.last_message_at) : 0;
    const bTs = b.last_message_at ? Date.parse(b.last_message_at) : 0;
    return bTs - aTs;
  });
}

export async function createGroup(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  description?: string,
): Promise<ChatGroup> {
  if (!name || name.trim().length === 0) {
    throw new ServiceError("Name erforderlich", 400, "name_required");
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new ServiceError(
      `Name zu lang (max ${MAX_NAME_LENGTH})`,
      400,
      "name_too_long",
    );
  }
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    throw new ServiceError(
      `Beschreibung zu lang (max ${MAX_DESCRIPTION_LENGTH})`,
      400,
      "description_too_long",
    );
  }

  const { data: group, error: groupError } = await supabase
    .from("chat_groups")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      created_by: userId,
    })
    .select()
    .single();

  if (groupError || !group) {
    throw new ServiceError(
      "Gruppe konnte nicht erstellt werden",
      500,
      "create_group_failed",
      { details: groupError?.message },
    );
  }

  // Creator als Admin hinzufuegen
  const { error: memberError } = await supabase
    .from("chat_group_members")
    .insert({
      group_id: group.id,
      user_id: userId,
      role: "admin",
    });

  if (memberError) {
    // Rollback: Gruppe wieder entfernen
    await supabase.from("chat_groups").delete().eq("id", group.id);
    throw new ServiceError(
      "Gruppen-Mitgliedschaft konnte nicht angelegt werden",
      500,
      "add_creator_failed",
      { details: memberError.message },
    );
  }

  return group;
}

export async function deleteGroup(
  supabase: SupabaseClient,
  groupId: string,
): Promise<void> {
  const { error } = await supabase
    .from("chat_groups")
    .delete()
    .eq("id", groupId);
  if (error) {
    throw new ServiceError(
      "Gruppe konnte nicht geloescht werden",
      500,
      "delete_group_failed",
      { details: error.message },
    );
  }
}

// ============================================================
// Mitglieder-Management
// ============================================================

export async function listGroupMembers(
  supabase: SupabaseClient,
  groupId: string,
): Promise<ChatGroupMember[]> {
  const { data, error } = await supabase
    .from("chat_group_members")
    .select("group_id, user_id, role, joined_at, last_read_at")
    .eq("group_id", groupId);

  if (error) {
    throw new ServiceError(
      "Mitglieder konnten nicht geladen werden",
      500,
      "list_members_failed",
      { details: error.message },
    );
  }

  return data ?? [];
}

export async function addGroupMember(
  supabase: SupabaseClient,
  groupId: string,
  userId: string,
  role: "admin" | "member" = "member",
): Promise<ChatGroupMember> {
  // Pre-check Limit (RLS-Trigger erzwingt es auch, aber klarere Fehlermeldung)
  const { count } = await supabase
    .from("chat_group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId);

  if ((count ?? 0) >= MAX_GROUP_MEMBERS) {
    throw new ServiceError(
      `Gruppe ist voll (max ${MAX_GROUP_MEMBERS} Mitglieder)`,
      400,
      "group_full",
    );
  }

  const { data, error } = await supabase
    .from("chat_group_members")
    .insert({ group_id: groupId, user_id: userId, role })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ServiceError(
        "User ist bereits Mitglied",
        409,
        "duplicate_member",
      );
    }
    if (error.message.includes("Maximum von 10")) {
      throw new ServiceError(
        `Gruppe ist voll (max ${MAX_GROUP_MEMBERS} Mitglieder)`,
        400,
        "group_full",
      );
    }
    throw new ServiceError(
      "Mitglied konnte nicht hinzugefuegt werden",
      500,
      "add_member_failed",
      { details: error.message },
    );
  }

  return data;
}

export async function removeGroupMember(
  supabase: SupabaseClient,
  groupId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("chat_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) {
    throw new ServiceError(
      "Mitglied konnte nicht entfernt werden",
      500,
      "remove_member_failed",
      { details: error.message },
    );
  }
}

// ============================================================
// Nachrichten
// ============================================================

export async function listGroupMessages(
  supabase: SupabaseClient,
  groupId: string,
  options: { limit?: number; before?: string } = {},
): Promise<ChatGroupMessage[]> {
  const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  let query = supabase
    .from("chat_group_messages")
    .select(
      "id, group_id, sender_id, content, media_type, media_url, media_duration_sec, created_at",
    )
    .eq("group_id", groupId)
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
      "list_group_messages_failed",
      { details: error.message },
    );
  }

  return data ?? [];
}

export interface SendGroupMessageInput {
  content?: string;
  media_type?: MediaType;
  media_url?: string;
  media_duration_sec?: number;
}

export async function sendGroupMessage(
  supabase: SupabaseClient,
  userId: string,
  groupId: string,
  input: SendGroupMessageInput,
): Promise<ChatGroupMessage> {
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
      "media_type erforderlich",
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

  const { data, error } = await supabase
    .from("chat_group_messages")
    .insert({
      group_id: groupId,
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
      "send_group_message_failed",
      { details: error.message },
    );
  }

  await supabase
    .from("chat_groups")
    .update({ last_message_at: data.created_at })
    .eq("id", groupId);

  return data;
}
