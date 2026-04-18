"use client";

// /chat/[id] — 1:1-Chat-Detail-View
//
// Realtime-Subscription auf direct_messages.INSERT fuer conversation_id.
// Optimistisches Rendering: Beim Senden wird die Nachricht direkt angehaengt.

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  MessageList,
  type MessageViewModel,
} from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import {
  listMessages,
  markConversationRead,
  sendDirectMessage,
  ChatApiError,
} from "@/lib/chat/client";
import {
  useChatRealtime,
  type RealtimeMessage,
} from "@/lib/hooks/useChatRealtime";
import { createClient } from "@/lib/supabase/client";

export default function DirectChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: conversationId } = use(params);
  const [messages, setMessages] = useState<MessageViewModel[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    void (async () => {
      const { data: conv } = await supabase
        .from("conversations")
        .select("participant_1, participant_2")
        .eq("id", conversationId)
        .maybeSingle();
      if (!conv) return;
      const peerId =
        conv.participant_1 === currentUserId
          ? conv.participant_2
          : conv.participant_1;
      const { data: names } = await supabase.rpc("get_display_names", {
        peer_ids: [peerId],
      });
      const first = (
        names as Array<{ display_name: string | null }> | null
      )?.[0];
      setPeerName(first?.display_name ?? null);
    })();
  }, [conversationId, currentUserId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const msgs = await listMessages(conversationId, { limit: 50 });
        if (cancelled) return;
        setMessages(msgs);
        // Fire-and-forget read-marking
        void markConversationRead(conversationId).catch(() => {});
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ChatApiError && err.status === 403
            ? "Kein Zugriff auf diese Unterhaltung"
            : err instanceof Error
              ? err.message
              : "Laden fehlgeschlagen",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const handleIncoming = useCallback((msg: RealtimeMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  useChatRealtime({ type: "direct", conversationId }, handleIncoming);

  async function handleSend(input: Parameters<typeof sendDirectMessage>[1]) {
    const sent = await sendDirectMessage(conversationId, input);
    setMessages((prev) => {
      if (prev.some((m) => m.id === sent.id)) return prev;
      return [...prev, sent];
    });
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-[#F8F9FA]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#2D3142]/10 bg-white px-4 py-3">
        <Link
          href="/chat"
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-[#2D3142]"
          aria-label="Zurueck zur Uebersicht"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="truncate text-lg font-bold text-[#2D3142]">
          {peerName ?? "Chat"}
        </h1>
      </header>

      {error ? (
        <div className="m-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[#2D3142]/60">
          Wird geladen...
        </div>
      ) : (
        <MessageList
          messages={messages}
          currentUserId={currentUserId ?? ""}
          showReadReceipts
        />
      )}

      <ChatInput
        scope="direct"
        ownerId={conversationId}
        onSend={handleSend}
        disabled={!!error}
      />
    </div>
  );
}
