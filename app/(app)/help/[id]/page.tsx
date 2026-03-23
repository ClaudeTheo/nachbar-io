"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Tag, User, Trash2, CircleCheck, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createNotification } from "@/lib/notifications";
import { HELP_CATEGORIES, HELP_SUBCATEGORIES } from "@/lib/constants";
import type { HelpRequest } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface HelpResponse {
  id: string;
  help_request_id: string;
  responder_user_id: string;
  message: string;
  created_at: string;
  responder?: { display_name: string; avatar_url: string | null };
}

export default function HelpDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [request, setRequest] = useState<HelpRequest | null>(null);
  const [responses, setResponses] = useState<HelpResponse[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const supabase = createClient();

      // Hilfe-Eintrag laden
      const { data, error: fetchError } = await supabase
        .from("help_requests")
        .select("*, user:users(display_name, avatar_url)")
        .eq("id", id)
        .maybeSingle();

      if (fetchError || !data) {
        setError("Eintrag nicht gefunden.");
        setLoading(false);
        return;
      }

      setRequest(data as unknown as HelpRequest);

      // Antworten laden (falls Tabelle existiert — graceful degradation)
      try {
        const { data: respData } = await supabase
          .from("help_responses")
          .select("*, responder:users(display_name, avatar_url)")
          .eq("help_request_id", id as string)
          .order("created_at", { ascending: true });

        if (respData) setResponses(respData as unknown as HelpResponse[]);
      } catch {
        // Tabelle existiert möglicherweise noch nicht — kein Fehler anzeigen
        console.log("help_responses Tabelle nicht verfügbar");
      }
      setLoading(false);
    }
    load();
  }, [id, user]);

  const isOwner = user?.id && request?.user_id === user?.id;
  const cat = request ? HELP_CATEGORIES.find((c) => c.id === request.category) : null;
  const subLabel = request?.subcategory
    ? HELP_SUBCATEGORIES[request.category]?.find((s) => s.id === request.subcategory)?.label
    : null;

  // Nachricht senden (mit KI-Moderation)
  async function handleSendMessage() {
    if (!message.trim() || !request || !user) return;
    setSending(true);

    try {
      // KI-Moderation: Nachricht pruefen bevor sie gespeichert wird
      try {
        const modResponse = await fetch("/api/moderation/moderate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: message.trim(),
            channel: "chat",
            contentType: "help_response",
          }),
        });

        if (modResponse.ok) {
          const modResult = await modResponse.json();
          if (modResult.score === "red") {
            setError("Ihre Nachricht verstoesst gegen unsere Richtlinien. Bitte formulieren Sie sie anders.");
            setSending(false);
            return;
          }
          if (modResult.score === "yellow") {
            // Warnung, aber nicht blockieren — wird in Moderation-Queue eingetragen
            console.log("[help] Nachricht zur Moderation vorgemerkt:", modResult.reason);
          }
        }
      } catch {
        // Moderation-Fehler blockiert nicht das Senden
        console.log("[help] Moderation nicht verfuegbar, Nachricht wird trotzdem gesendet");
      }

      const supabase = createClient();
      const { error: insertError } = await supabase.from("help_responses").insert({
        help_request_id: request.id,
        responder_user_id: user?.id,
        message: message.trim(),
      });

      if (insertError) {
        console.error("Antwort-Fehler:", insertError);
        // Falls Tabelle nicht existiert, hilfreiche Meldung
        if (insertError.code === "42P01") {
          setError("Nachrichten-Funktion wird noch eingerichtet.");
        } else {
          setError("Nachricht konnte nicht gesendet werden.");
        }
        setSending(false);
        return;
      }

      // Antwort zur Liste hinzufügen
      const { data: profile } = await supabase
        .from("users")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .single();

      setResponses((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          help_request_id: request.id,
          responder_user_id: user.id,
          message: message.trim(),
          created_at: new Date().toISOString(),
          responder: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url } : undefined,
        },
      ]);

      // Ersteller benachrichtigen
      createNotification({
        userId: request.user_id,
        type: "help_response",
        title: "Neue Antwort auf Ihr Gesuch",
        body: message.trim().length > 80 ? message.trim().slice(0, 80) + "..." : message.trim(),
        referenceId: request.id,
        referenceType: "help_request",
      });

      setMessage("");
    } catch {
      setError("Netzwerkfehler beim Senden.");
    }
    setSending(false);
  }

  // Eintrag schließen
  async function handleClose() {
    if (!request) return;
    const supabase = createClient();
    await supabase.from("help_requests").update({ status: "closed" }).eq("id", request.id);
    setRequest({ ...request, status: "closed" as HelpRequest["status"] });
  }

  // Eintrag löschen
  async function handleDelete() {
    if (!request) return;
    const supabase = createClient();
    await supabase.from("help_requests").delete().eq("id", request.id);
    router.push("/help");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-40 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="space-y-4">
        <Link href="/help" className="flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Zurück zur Börse
        </Link>
        <p className="text-center text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!request) return null;

  const timeAgo = formatDistanceToNow(new Date(request.created_at), {
    addSuffix: true,
    locale: de,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={request.type === "need" ? "Hilfegesuch" : "Hilfsangebot"}
        backHref="/help"
      />

      {/* Hauptkarte */}
      <div className="rounded-xl border-2 border-border bg-white p-5">
        <div className="flex items-start gap-4">
          <span className="text-4xl">{cat?.icon ?? "❓"}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-anthrazit">{request.title}</h2>
              <Badge variant={request.type === "need" ? "default" : "secondary"}>
                {request.type === "need" ? "Gesucht" : "Angebot"}
              </Badge>
            </div>

            {request.status !== "active" && (
              <Badge variant="outline" className="mt-1">
                {request.status === "matched" ? "Vermittelt" : "Geschlossen"}
              </Badge>
            )}

            {request.description && (
              <p className="mt-3 text-muted-foreground">{request.description}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />
                {cat?.label ?? request.category}
                {subLabel && (
                  <span className="ml-1 rounded-full bg-quartier-green/10 px-2 py-0.5 text-xs font-medium text-quartier-green">
                    {subLabel}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {timeAgo}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {request.user?.display_name ?? "Nachbar"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Aktionen für den Ersteller */}
      {isOwner && request.status === "active" && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            <CircleCheck className="mr-2 h-4 w-4" />
            Als erledigt markieren
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            className="text-emergency-red hover:bg-red-50 hover:text-emergency-red"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Antworten / Nachrichten */}
      <div className="space-y-3">
        <h3 className="font-semibold text-anthrazit">
          <MessageCircle className="mr-1 inline h-4 w-4" />
          Nachrichten ({responses.length})
        </h3>

        {responses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Nachrichten. Schreiben Sie dem Nachbarn!
          </p>
        ) : (
          <div className="space-y-2">
            {responses.map((resp) => (
              <div
                key={resp.id}
                className={`rounded-lg p-3 ${
                  resp.responder_user_id === user?.id
                    ? "bg-quartier-green/10 ml-8"
                    : "bg-muted mr-8"
                }`}
              >
                <p className="text-sm font-medium text-anthrazit">
                  {resp.responder?.display_name ?? "Nachbar"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{resp.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(resp.created_at), {
                    addSuffix: true,
                    locale: de,
                  })}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Nachricht schreiben (nur wenn nicht eigener Eintrag oder für Kommunikation) */}
        {user?.id && request.status === "active" && (
          <div className="space-y-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isOwner
                  ? "Antworten Sie auf Nachrichten..."
                  : request.type === "need"
                    ? "Ich kann helfen! ..."
                    : "Ich hätte Interesse an Ihrem Angebot..."
              }
              rows={2}
              maxLength={300}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{message.length}/300</p>
              <Button
                onClick={handleSendMessage}
                disabled={sending || !message.trim()}
                size="sm"
                className="bg-quartier-green hover:bg-quartier-green-dark"
              >
                {sending ? "Senden..." : "Nachricht senden"}
              </Button>
            </div>
          </div>
        )}

        {request.status !== "active" && (
          <p className="text-center text-sm text-muted-foreground">
            Dieser Eintrag ist geschlossen. Keine neuen Nachrichten möglich.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-emergency-red">{error}</p>}
    </div>
  );
}
