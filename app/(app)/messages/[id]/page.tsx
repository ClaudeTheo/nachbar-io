"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications";
import type { DirectMessage } from "@/lib/supabase/types";
import { format, isToday, isYesterday } from "date-fns";
import { de } from "date-fns/locale";

export default function ChatPage() {
  const { id: conversationId } = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserName, setOtherUserName] = useState<string>("Nachbar");
  const [otherUserAvatar, setOtherUserAvatar] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Automatisch nach unten scrollen
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Nachrichten als gelesen markieren
  const markAsRead = useCallback(
    async (userId: string) => {
      const supabase = createClient();
      await supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId as string)
        .neq("sender_id", userId)
        .is("read_at", null);
    },
    [conversationId]
  );

  // Initiale Daten laden
  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Aktuellen Benutzer laden
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUserId(user.id);

      // Konversation laden und Berechtigung pruefen
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId as string)
        .single();

      if (convError || !conv) {
        toast.error("Konversation nicht gefunden.");
        router.push("/messages");
        return;
      }

      // Pruefen ob der aktuelle Nutzer Teilnehmer ist
      if (conv.participant_1 !== user.id && conv.participant_2 !== user.id) {
        toast.error("Sie haben keinen Zugriff auf diese Konversation.");
        router.push("/messages");
        return;
      }

      // Anderen Teilnehmer bestimmen und Profil laden
      const resolvedOtherUserId =
        conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
      setOtherUserId(resolvedOtherUserId);

      const { data: otherUser } = await supabase
        .from("users")
        .select("display_name, avatar_url")
        .eq("id", resolvedOtherUserId)
        .single();

      if (otherUser) {
        setOtherUserName(otherUser.display_name);
        setOtherUserAvatar(otherUser.avatar_url);
      }

      // Alle Nachrichten laden
      const { data: msgData } = await supabase
        .from("direct_messages")
        .select("*, sender:users(display_name, avatar_url)")
        .eq("conversation_id", conversationId as string)
        .order("created_at", { ascending: true });

      if (msgData) {
        setMessages(msgData as unknown as DirectMessage[]);
      }

      // Ungelesene Nachrichten als gelesen markieren
      await markAsRead(user.id);

      setLoading(false);
    }
    load();
  }, [conversationId, router, markAsRead]);

  // Nach dem Laden und bei neuen Nachrichten nach unten scrollen
  useEffect(() => {
    if (!loading) {
      scrollToBottom();
    }
  }, [messages, loading, scrollToBottom]);

  // Supabase Realtime: neue Nachrichten in dieser Konversation empfangen
  useEffect(() => {
    if (!currentUserId || !conversationId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as DirectMessage;

          // Absender-Profil laden, falls noch nicht vorhanden
          const { data: senderProfile } = await supabase
            .from("users")
            .select("display_name, avatar_url")
            .eq("id", newMsg.sender_id)
            .single();

          const enrichedMsg: DirectMessage = {
            ...newMsg,
            sender: senderProfile
              ? { display_name: senderProfile.display_name, avatar_url: senderProfile.avatar_url }
              : undefined,
          };

          // Duplikate vermeiden (eigene Nachrichten wurden schon optimistisch hinzugefuegt)
          setMessages((prev) => {
            if (prev.some((m) => m.id === enrichedMsg.id)) return prev;
            return [...prev, enrichedMsg];
          });

          // Empfangene Nachrichten sofort als gelesen markieren
          if (newMsg.sender_id !== currentUserId) {
            await markAsRead(currentUserId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, conversationId, markAsRead]);

  // Nachricht senden
  async function handleSend() {
    if (!inputValue.trim() || !currentUserId || sending) return;

    const content = inputValue.trim();
    setInputValue("");
    setSending(true);

    try {
      const supabase = createClient();

      // Nachricht einfuegen
      const { data: inserted, error: insertError } = await supabase
        .from("direct_messages")
        .insert({
          conversation_id: conversationId as string,
          sender_id: currentUserId,
          content,
        })
        .select("*, sender:users(display_name, avatar_url)")
        .single();

      if (insertError) {
        toast.error("Nachricht konnte nicht gesendet werden.");
        setInputValue(content); // Eingabe wiederherstellen
        setSending(false);
        return;
      }

      // Optimistisch zur Liste hinzufuegen (Realtime erkennt Duplikate)
      if (inserted) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === (inserted as unknown as DirectMessage).id)) return prev;
          return [...prev, inserted as unknown as DirectMessage];
        });
      }

      // Konversations-Zeitstempel aktualisieren
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId as string);

      // Empfaenger benachrichtigen
      if (otherUserId) {
        createNotification({
          userId: otherUserId,
          type: "message",
          title: "Neue Nachricht",
          body: content.length > 80 ? content.slice(0, 80) + "..." : content,
          referenceId: conversationId as string,
          referenceType: "conversation",
        });
      }
    } catch {
      toast.error("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      setInputValue(content);
    }

    setSending(false);
  }

  // Enter zum Senden (Shift+Enter fuer Zeilenumbruch)
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Ladezustand
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-7rem)] flex-col">
        {/* Header-Skeleton */}
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </div>
        {/* Nachrichten-Skeleton */}
        <div className="flex-1 space-y-4 py-4">
          <div className="flex justify-start">
            <Skeleton className="h-16 w-48 rounded-2xl" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-12 w-40 rounded-2xl" />
          </div>
          <div className="flex justify-start">
            <Skeleton className="h-20 w-56 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <Link href="/messages" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-quartier-green/10 text-sm font-bold text-quartier-green">
            {otherUserAvatar ? (
              <img
                src={otherUserAvatar}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              (otherUserName[0] ?? "N").toUpperCase()
            )}
          </div>
          <h1 className="text-lg font-bold text-anthrazit">{otherUserName}</h1>
        </div>
      </div>

      {/* Nachrichten-Bereich (scrollbar) */}
      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Schreiben Sie die erste Nachricht!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, index) => {
              const isOwn = msg.sender_id === currentUserId;
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

              // Pruefen ob ein neuer Absender-Block beginnt
              const isFirstInSequence = !prevMsg || prevMsg.sender_id !== msg.sender_id;
              // Pruefen ob der aktuelle Block endet
              const isLastInSequence = !nextMsg || nextMsg.sender_id !== msg.sender_id;

              // Datums-Trennlinie einfuegen
              const showDateSeparator =
                !prevMsg || !isSameDay(msg.created_at, prevMsg.created_at);

              return (
                <div key={msg.id}>
                  {/* Datums-Trennlinie */}
                  {showDateSeparator && (
                    <div className="flex items-center justify-center py-3">
                      <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                        {formatDateLabel(msg.created_at)}
                      </span>
                    </div>
                  )}

                  {/* Nachricht */}
                  <div
                    className={`flex ${isOwn ? "justify-end" : "justify-start"} ${
                      isFirstInSequence ? "mt-3" : "mt-0.5"
                    }`}
                  >
                    <div className={`max-w-[80%] ${isOwn ? "items-end" : "items-start"}`}>
                      {/* Absender-Name (nur beim ersten in einer Sequenz, nur fuer andere) */}
                      {isFirstInSequence && !isOwn && (
                        <p className="mb-1 ml-3 text-xs font-medium text-muted-foreground">
                          {msg.sender?.display_name ?? otherUserName}
                        </p>
                      )}

                      {/* Nachrichten-Blase */}
                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          isOwn
                            ? "bg-quartier-green text-white"
                            : "bg-white border border-border text-anthrazit"
                        } ${
                          // Ecken anpassen fuer Sequenzen
                          isOwn
                            ? isFirstInSequence && isLastInSequence
                              ? "rounded-2xl"
                              : isFirstInSequence
                                ? "rounded-br-md"
                                : isLastInSequence
                                  ? "rounded-tr-md"
                                  : "rounded-r-md"
                            : isFirstInSequence && isLastInSequence
                              ? "rounded-2xl"
                              : isFirstInSequence
                                ? "rounded-bl-md"
                                : isLastInSequence
                                  ? "rounded-tl-md"
                                  : "rounded-l-md"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {msg.content}
                        </p>
                      </div>

                      {/* Zeitstempel (nur beim letzten in einer Sequenz) */}
                      {isLastInSequence && (
                        <p
                          className={`mt-1 text-[11px] text-muted-foreground ${
                            isOwn ? "mr-3 text-right" : "ml-3 text-left"
                          }`}
                        >
                          {format(new Date(msg.created_at), "HH:mm", { locale: de })}
                          {/* Lesebestaetigung fuer eigene Nachrichten */}
                          {isOwn && msg.read_at && (
                            <span className="ml-1 text-quartier-green/70">
                              Gelesen
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Eingabefeld (fixiert am unteren Rand) */}
      <div className="border-t border-border bg-warmwhite pt-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nachricht schreiben..."
            rows={1}
            maxLength={1000}
            className="flex-1 resize-none rounded-2xl border border-border bg-white px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
            style={{
              minHeight: "2.75rem",
              maxHeight: "7rem",
            }}
            onInput={(e) => {
              // Auto-resize der Textarea
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 112) + "px";
            }}
          />
          <Button
            onClick={handleSend}
            disabled={sending || !inputValue.trim()}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full bg-quartier-green hover:bg-quartier-green-dark disabled:opacity-40"
            aria-label="Nachricht senden"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hilfsfunktionen

// Pruefen ob zwei Zeitstempel am selben Tag sind
function isSameDay(dateStr1: string, dateStr2: string): boolean {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// Datumsbeschriftung fuer die Trennlinie
function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Heute";
  if (isYesterday(date)) return "Gestern";
  return format(date, "EEEE, d. MMMM", { locale: de });
}
