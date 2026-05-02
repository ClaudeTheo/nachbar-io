"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, UserPlus, Check, X, MapPin } from "lucide-react";
import {
  PageHeader,
  Skeleton,
  Badge,
  Button,
  Separator,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createNotification } from "@/lib/notifications";
import type { Conversation, NeighborConnection } from "@/lib/supabase/types";
import {
  listConversations as listChatConversations,
  listContacts,
  openConversation,
  updateContactStatus,
} from "@/lib/chat/client";

// Erweiterte Anfrage mit Adressinformation
interface PendingRequestWithAddress {
  requester_id: string;
  addressee_id: string;
  created_at: string;
  message: string | null;
  requester?: NeighborConnection["requester"];
  requesterAddress?: string;
}
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { ResidentBrowser } from "@/components/chat/ResidentBrowser";

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<
    PendingRequestWithAddress[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [showResidentBrowser, setShowResidentBrowser] = useState(false);

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
      return;
    }

    const chatSummaries = await listChatConversations().catch(() => []);
    const peerNames = new Map(
      chatSummaries.map((summary) => [summary.id, summary.peer_display_name]),
    );

    // Fuer jede Konversation: anderen Teilnehmer, letzte Nachricht und ungelesene Anzahl laden
    const enriched = await Promise.all(
      data.map(async (conv) => {
        const otherUserId =
          conv.participant_1 === userId
            ? conv.participant_2
            : conv.participant_1;

        // Profilname des anderen Teilnehmers laden
        const { data: otherUser } = await supabase
          .from("users")
          .select("display_name, avatar_url")
          .eq("id", otherUserId)
          .maybeSingle();

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
            ? {
                display_name:
                  otherUser.display_name ??
                  peerNames.get(conv.id) ??
                  "Nachbar",
                avatar_url: otherUser.avatar_url,
              }
            : {
                display_name: peerNames.get(conv.id) ?? "Nachbar",
                avatar_url: null,
              },
          last_message: lastMsg?.content ?? undefined,
          unread_count: unreadCount ?? 0,
        } as Conversation;
      }),
    );

    setConversations(enriched);
  }, []);

  // Offene Verbindungsanfragen laden (inkl. Adresse des Anfragenden)
  const loadPendingRequests = useCallback(async (_userId: string) => {
    try {
      const contacts = await listContacts("pending");
      setPendingRequests(
        contacts
          .filter((contact) => contact.direction === "incoming")
          .map((contact) => ({
            requester_id: contact.requester_id,
            addressee_id: contact.addressee_id,
            created_at: contact.created_at,
            message: contact.note,
            requester: {
              display_name: contact.other_display_name ?? "Nachbar",
              avatar_url: null,
            },
          })),
      );
    } catch (error) {
      console.error(
        "[messages] Kontaktanfragen konnten nicht geladen werden:",
        error,
      );
      setPendingRequests([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (authLoading) {
        setLoading(true);
        return;
      }

      if (!user?.id) {
        setConversations([]);
        setPendingRequests([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      await Promise.all([
        loadConversations(user.id),
        loadPendingRequests(user.id),
      ]);

      if (!cancelled) {
        setLoading(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, loadConversations, loadPendingRequests]);

  // Supabase Realtime: bei neuen Nachrichten automatisch aktualisieren
  useEffect(() => {
    if (!user?.id) return;

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
          loadConversations(user!.id);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contact_links",
        },
        () => {
          loadPendingRequests(user!.id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loadConversations, loadPendingRequests]);

  // Verbindungsanfrage annehmen
  async function acceptRequest(requesterId: string) {
    if (!user?.id) return;
    let convId = "";

    try {
      await updateContactStatus(requesterId, "accepted");
      const conversation = await openConversation(requesterId);
      convId = conversation.id;
    } catch (error) {
      console.error("[messages] Contact-Link-Annahme fehlgeschlagen:", error);
      toast.error("Anfrage konnte nicht angenommen werden.");
      return;
    }

    toast.success("Verbindung angenommen!");

    // Anfragenden benachrichtigen
    createNotification({
      userId: requesterId,
      type: "connection_accepted",
      title: "Verbindung angenommen",
      body: "Ihre Nachbar-Anfrage wurde angenommen. Sie können jetzt chatten!",
      referenceId: convId,
      referenceType: "conversation",
    });

    await loadPendingRequests(user!.id);
    await loadConversations(user!.id);

    if (convId) {
      router.push(`/messages/${convId}`);
    }
  }

  // Verbindungsanfrage ablehnen
  async function declineRequest(requesterId: string) {
    if (!user?.id) return;

    await updateContactStatus(requesterId, "rejected");

    toast("Anfrage abgelehnt");
    await loadPendingRequests(user!.id);
  }

  // Ladezustand
  if (loading) {
    return (
      <div className="animate-fade-in-up">
        <div className="mb-4">
          <Skeleton className="h-7 w-40" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border bg-white p-4"
            >
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
      <PageHeader title="Nachrichten" backHref="/dashboard" className="mb-4" />

      {/* Bewohner kontaktieren */}
      <Button
        onClick={() => setShowResidentBrowser(true)}
        className="w-full min-h-[52px] bg-[#4CAF87] hover:bg-[#3d9a74] text-white mb-4"
      >
        <MapPin className="h-4 w-4 mr-2" />
        Bewohner kontaktieren
      </Button>

      {/* Offene Nachbar-Anfragen */}
      {pendingRequests.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-quartier-green" />
            <h2 className="text-sm font-semibold text-anthrazit">
              Nachbar-Anfragen
            </h2>
            <Badge className="bg-quartier-green text-white text-xs px-1.5 py-0.5">
              {pendingRequests.length}
            </Badge>
          </div>

          <div className="space-y-2">
            {pendingRequests.map((req) => {
              const name = req.requester?.display_name ?? "Nachbar";
              const initial = (name[0] ?? "N").toUpperCase();
              return (
                <div
                  key={`${req.requester_id}-${req.addressee_id}`}
                  className="rounded-lg border border-quartier-green/30 bg-quartier-green/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-quartier-green/10 text-sm font-bold text-quartier-green">
                      {req.requester?.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={req.requester.avatar_url}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        initial
                      )}
                    </div>

                    {/* Inhalt */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-anthrazit">
                        {name}
                      </p>
                      {req.requesterAddress && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 text-quartier-green shrink-0" />
                          <span>{req.requesterAddress}</span>
                        </div>
                      )}
                      {req.message && (
                        <div className="mt-1.5 rounded-lg bg-muted/50 p-3">
                          <p className="text-xs text-anthrazit/80 line-clamp-3">
                            &ldquo;{req.message}&rdquo;
                          </p>
                        </div>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground/60">
                        {formatDistanceToNow(new Date(req.created_at), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </p>
                    </div>

                    {/* Aktionen */}
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        className="gap-1 bg-quartier-green hover:bg-quartier-green/90"
                        onClick={() => acceptRequest(req.requester_id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Annehmen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => declineRequest(req.requester_id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Separator className="mt-4" />
        </div>
      )}

      {/* Konversationsliste */}
      {conversations.length === 0 && pendingRequests.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="mt-4 text-muted-foreground">Noch keine Nachrichten</p>
          <p className="mt-2 text-sm text-muted-foreground/70">
            Klicken Sie auf ein Haus in der Quartierskarte, um sich mit Nachbarn
            zu verbinden.
          </p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Noch keine Konversationen
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Nach Annahme einer Anfrage wird automatisch ein Chat gestartet.
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
            Neue Verbindungen über die Quartierskarte herstellen.
          </p>
        </div>
      )}

      {/* Bewohner-Browser Sheet */}
      <ResidentBrowser
        open={showResidentBrowser}
        onClose={() => setShowResidentBrowser(false)}
        onRequestSent={() => {
          if (user?.id) {
            loadPendingRequests(user!.id);
            loadConversations(user!.id);
          }
        }}
      />
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
      data-testid="conversation-card"
    >
      <div className="flex items-center gap-3">
        {/* Avatar-Platzhalter */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-quartier-green/10 text-lg font-bold text-quartier-green">
          {conversation.other_user?.avatar_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
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
                hasUnread
                  ? "font-bold text-anthrazit"
                  : "font-medium text-anthrazit"
              }`}
            >
              {displayName}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {timeAgo}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p
              className={`truncate text-sm ${
                hasUnread
                  ? "font-medium text-anthrazit"
                  : "text-muted-foreground"
              }`}
            >
              {preview}
            </p>
            {hasUnread && (
              <Badge
                className="shrink-0 bg-quartier-green text-white text-xs px-1.5 py-0.5 min-w-[1.25rem] text-center"
                data-testid="unread-count"
              >
                {conversation.unread_count}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
