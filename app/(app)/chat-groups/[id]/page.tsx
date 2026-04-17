"use client";

// /chat-groups/[id] — Gruppen-Chat-Detail-View mit Mitgliederzahl im Header

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users as UsersIcon } from "lucide-react";
import {
  MessageList,
  type MessageViewModel,
} from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import {
  listGroupMessages,
  sendGroupMessage,
  listMyGroups,
  listGroupMembers,
  ChatApiError,
} from "@/lib/chat/client";
import {
  useChatRealtime,
  type RealtimeMessage,
} from "@/lib/hooks/useChatRealtime";
import { createClient } from "@/lib/supabase/client";
import type { ChatGroup } from "@/modules/chat/services/chat-groups.service";

export default function GroupChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: groupId } = use(params);
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [messages, setMessages] = useState<MessageViewModel[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [myGroups, msgs, members] = await Promise.all([
          listMyGroups(),
          listGroupMessages(groupId, { limit: 50 }),
          listGroupMembers(groupId),
        ]);
        if (cancelled) return;
        const found = myGroups.find((g) => g.id === groupId) ?? null;
        setGroup(found);
        setMemberCount(members.length);
        setMessages(msgs);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ChatApiError && err.status === 403
            ? "Kein Zugriff auf diese Gruppe"
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
  }, [groupId]);

  const handleIncoming = useCallback((msg: RealtimeMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  useChatRealtime({ type: "group", groupId }, handleIncoming);

  async function handleSend(input: Parameters<typeof sendGroupMessage>[1]) {
    const sent = await sendGroupMessage(groupId, input);
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
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-[#2D3142]">
            {group?.name ?? "Gruppe"}
          </h1>
          <div className="flex items-center gap-1 text-xs text-[#2D3142]/60">
            <UsersIcon className="h-3 w-3" />
            {memberCount} Mitglied{memberCount === 1 ? "" : "er"}
          </div>
        </div>
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
        <MessageList messages={messages} currentUserId={currentUserId ?? ""} />
      )}

      <ChatInput
        scope="chat"
        ownerId={groupId}
        onSend={handleSend}
        disabled={!!error}
      />
    </div>
  );
}
