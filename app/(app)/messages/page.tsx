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
import { useQuarter } from "@/lib/quarters";
import type { Conversation, NeighborConnection } from "@/lib/supabase/types";

// Erweiterte Anfrage mit Adressinformation
interface PendingRequestWithAddress extends NeighborConnection {
  requesterAddress?: string;
}
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { ResidentBrowser } from "@/components/chat/ResidentBrowser";

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { currentQuarter } = useQuarter();
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
      setLoading(false);
      return;
    }

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
            ? {
                display_name: otherUser.display_name,
                avatar_url: otherUser.avatar_url,
              }
            : undefined,
          last_message: lastMsg?.content ?? undefined,
          unread_count: unreadCount ?? 0,
        } as Conversation;
      }),
    );

    setConversations(enriched);
    setLoading(false);
  }, []);

  // Offene Verbindungsanfragen laden (inkl. Adresse des Anfragenden)
  const loadPendingRequests = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("neighbor_connections")
      .select(
        "*, requester:users!neighbor_connections_requester_id_fkey(display_name, avatar_url)",
      )
      .eq("target_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      // Adressen der Anfragenden laden
      const requesterIds = data.map((r) => r.requester_id);
      const { data: requesterHouseholds } = await supabase
        .from("household_members")
        .select("user_id, households(street_name, house_number)")
        .in("user_id", requesterIds);

      // Adress-Map erstellen: user_id → "Straße Hausnummer"
      const addressMap = new Map<string, string>();
      if (requesterHouseholds) {
        for (const hm of requesterHouseholds) {
          const household = hm.households as {
            street_name?: string;
            house_number?: string;
          } | null;
          if (household?.street_name) {
            addressMap.set(
              hm.user_id,
              `${household.street_name} ${household.house_number || ""}`.trim(),
            );
          }
        }
      }

      setPendingRequests(
        data.map((d) => ({
          ...d,
          requester: d.requester as unknown as NeighborConnection["requester"],
          requesterAddress: addressMap.get(d.requester_id),
        })),
      );
    } else {
      setPendingRequests([]);
    }
  }, []);

  useEffect(() => {
    async function init() {
      if (!user) {
        setLoading(false);
        return;
      }

      await Promise.all([
        loadConversations(user.id),
        loadPendingRequests(user.id),
      ]);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadConversations, loadPendingRequests]);

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
          table: "neighbor_connections",
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
  async function acceptRequest(connectionId: string, requesterId: string) {
    if (!user?.id) return;
    const supabase = createClient();

    // Anfrage annehmen
    await supabase
      .from("neighbor_connections")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", connectionId);

    // Konversation erstellen/oeffnen
    const p1 = user?.id < requesterId ? user?.id : requesterId;
    const p2 = user?.id < requesterId ? requesterId : user?.id;

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(participant_1.eq.${user?.id},participant_2.eq.${requesterId}),and(participant_1.eq.${requesterId},participant_2.eq.${user?.id})`,
      )
      .maybeSingle();

    let convId: string;
    if (existing) {
      convId = existing.id;
    } else {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          participant_1: p1,
          participant_2: p2,
          quarter_id: currentQuarter?.id,
        })
        .select("id")
        .single();
      convId = newConv?.id ?? "";
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
  async function declineRequest(connectionId: string) {
    if (!user?.id) return;
    const supabase = createClient();

    await supabase
      .from("neighbor_connections")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", connectionId);

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
                  key={req.id}
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
                        onClick={() => acceptRequest(req.id, req.requester_id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Annehmen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => declineRequest(req.id)}
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
