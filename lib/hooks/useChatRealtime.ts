"use client";

// Supabase-Realtime-Hook fuer Chat-Nachrichten.
// Abonniert INSERT-Events auf direct_messages oder chat_group_messages
// und ruft den Callback bei neuen Nachrichten auf.

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type ChatScope =
  | { type: "direct"; conversationId: string }
  | { type: "group"; groupId: string };

export interface RealtimeMessage {
  id: string;
  sender_id: string;
  content: string | null;
  media_type: "image" | "audio" | null;
  media_url: string | null;
  media_duration_sec: number | null;
  created_at: string;
  // direct-only
  conversation_id?: string;
  read_at?: string | null;
  // group-only
  group_id?: string;
}

/**
 * Abonniert neue Nachrichten. Callback wird pro eingehendem INSERT aufgerufen.
 * Cleanup beim Unmount oder wenn sich scope aendert.
 */
export function useChatRealtime(
  scope: ChatScope,
  onInsert: (message: RealtimeMessage) => void,
) {
  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;

  useEffect(() => {
    const supabase = createClient();
    const tableName =
      scope.type === "direct" ? "direct_messages" : "chat_group_messages";
    const filterColumn =
      scope.type === "direct" ? "conversation_id" : "group_id";
    const filterValue =
      scope.type === "direct" ? scope.conversationId : scope.groupId;

    const channelName = `chat:${scope.type}:${filterValue}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as never,
        {
          event: "INSERT",
          schema: "public",
          table: tableName,
          filter: `${filterColumn}=eq.${filterValue}`,
        },
        (payload: { new: RealtimeMessage }) => {
          onInsertRef.current(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    scope.type,
    scope.type === "direct" ? scope.conversationId : scope.groupId,
  ]);
}
