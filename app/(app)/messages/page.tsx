"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Konversationen laden
  const loadConversations = useCallback(async (userId: string) => {
    const supabase = createClient();

    // Alle Konversationen laden, in denen der Nutzer beteiligt ist
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order("last_message_at", { ascending: false });

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Fuer jede Konversation: anderen Teilnehmer, letzte Nachricht und ungelesene Anzahl laden
    const enriched = await Promise.all(
      data.map(async (conv) => {
        const otherUserId =
          conv.participant_1 === userId ? conv.participant_2 : conv.participant_1;

        // Profilname des anderen Teilnehmers laden
        const { data: otherUser } = await supabase
          .from("users")
          .select("display_name, avatar_url")
          .eq("id", otherUserId)
          .single();

        // Letzte Nachricht laden
        const { data: lastMsg } = await supabase
          .from("direct_messages")
          .select("content")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Ungelesene Nachrichten zaehlen (nicht vom aktuellen Nutzer, ohne read_at)
        const { count: unreadCount } = await supabase
          .from("direct_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .neq("sender_id", userId)
          .is("read_at", null);

        return {
          ...conv,
          other_user: otherUser
            ? { display_name: otherUser.display_name, avatar_url: otherUser.avatar_url }
            : undefined,
          last_message: lastMsg?.content ?? undefined,
          unread_count: unreadCount ?? 0,
        } as Conversation;
      })
    );

    setConversations(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);
      await loadConversations(user.id);
    }
    init();
  }, [loadConversations]);

  // Supabase Realtime: bei neuen Nachrichten automatisch aktualisieren
  useEffect(() => {
    if (!currentUserId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("messages-list-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        () => {
          // Bei jeder neuen Nachricht Konversationen neu laden
          loadConversations(currentUserId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadConversations]);

  // Ladezustand
  if (loading) {
    return (
      <div className="animate-fade-in-up">
        <div className="mb-4">
          <Skeleton className="h-7 w-40" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-white p-4">
              <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-anthrazit">Nachrichten</h1>
      </div>

      {/* Konversationsliste */}
      {conversations.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="mt-4 text-muted-foreground">Noch keine Nachrichten</p>
          <p className="mt-2 text-sm text-muted-foreground/70">
            Nachrichten können über das Profil eines Nachbarn gestartet werden.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <ConversationCard
              key={conv.id}
              conversation={conv}
              onClick={() => router.push(`/messages/${conv.id}`)}
            />
          ))}

          {/* Hinweis */}
          <p className="pt-4 text-center text-xs text-muted-foreground/60">
            Nachrichten können über das Profil eines Nachbarn gestartet werden.
          </p>
        </div>
      )}
    </div>
  );
}

// Einzelne Konversationskarte
function ConversationCard({
  conversation,
  onClick,
}: {
  conversation: Conversation;
  onClick: () => void;
}) {
  const displayName = conversation.other_user?.display_name ?? "Nachbar";
  const initial = (displayName[0] ?? "N").toUpperCase();
  const hasUnread = (conversation.unread_count ?? 0) > 0;

  // Letzte Nachricht kuerzen
  const preview = conversation.last_message
    ? conversation.last_message.length > 60
      ? conversation.last_message.slice(0, 60) + "..."
      : conversation.last_message
    : "Noch keine Nachricht";

  // Zeitanzeige
  const timeAgo = formatDistanceToNow(new Date(conversation.last_message_at), {
    addSuffix: true,
    locale: de,
  });

  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-white p-4 text-left transition-all hover:border-quartier-green hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        {/* Avatar-Platzhalter */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-quartier-green/10 text-lg font-bold text-quartier-green">
          {conversation.other_user?.avatar_url ? (
            <img
              src={conversation.other_user.avatar_url}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            initial
          )}
        </div>

        {/* Inhalt */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`truncate text-sm ${
                hasUnread ? "font-bold text-anthrazit" : "font-medium text-anthrazit"
              }`}
            >
              {displayName}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{timeAgo}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p
              className={`truncate text-sm ${
                hasUnread ? "font-medium text-anthrazit" : "text-muted-foreground"
              }`}
            >
              {preview}
            </p>
            {hasUnread && (
              <Badge className="shrink-0 bg-quartier-green text-white text-xs px-1.5 py-0.5 min-w-[1.25rem] text-center">
                {conversation.unread_count}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
