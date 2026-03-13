"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Clock, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications";
import { LEIHBOERSE_CATEGORIES } from "@/lib/constants";
import type { LeihboerseItem } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function LeihboerseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [item, setItem] = useState<LeihboerseItem | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data } = await supabase
        .from("leihboerse_items")
        .select("*, user:users!user_id(display_name, avatar_url)")
        .eq("id", id)
        .maybeSingle();

      if (data) setItem(data as unknown as LeihboerseItem);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Laden...</div>;
  }

  if (!item) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Angebot nicht gefunden.</p>
        <Link href="/leihboerse" className="mt-2 inline-block text-sm text-quartier-green hover:underline">
          Zurück zur Leihbörse
        </Link>
      </div>
    );
  }

  const category = LEIHBOERSE_CATEGORIES.find((c) => c.id === item.category);
  const isOwner = currentUserId === item.user_id;
  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: de });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/leihboerse" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Detail</h1>
      </div>

      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        {/* Kategorie-Icon */}
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-muted text-3xl">
          {category?.icon ?? "📦"}
        </div>

        {/* Titel + Badge */}
        <h2 className="text-xl font-bold text-anthrazit">{item.title}</h2>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant={item.type === "lend" ? "default" : "secondary"}>
            {item.type === "lend" ? "🔄 Verleihen" : "🔍 Suche"}
          </Badge>
          <Badge variant="outline">{category?.label}</Badge>
          {item.status === "reserved" && <Badge className="bg-alert-amber text-white">Reserviert</Badge>}
        </div>

        {/* Beschreibung */}
        {item.description && (
          <p className="mt-4 text-muted-foreground">{item.description}</p>
        )}

        {/* Details */}
        <div className="mt-4 space-y-2">
          {item.deposit && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="h-4 w-4" />
              <span>Pfand: {item.deposit}</span>
            </div>
          )}
          {item.available_until && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Verfügbar bis: {new Date(item.available_until).toLocaleDateString("de-DE")}</span>
            </div>
          )}
        </div>

        {/* Anbieter */}
        <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-lg">
            {item.user?.avatar_url || "👤"}
          </div>
          <span>{item.user?.display_name}</span>
          <span>·</span>
          <span>{timeAgo}</span>
        </div>
      </div>

      {/* Aktionsbuttons */}
      {!isOwner && item.status === "active" && (
        <Button
          onClick={async () => {
            if (!currentUserId || !item) return;
            const supabase = createClient();

            // Bestehende Konversation suchen oder neue erstellen
            const { data: existing } = await supabase
              .from("conversations")
              .select("id")
              .or(
                `and(participant_1.eq.${currentUserId},participant_2.eq.${item.user_id}),and(participant_1.eq.${item.user_id},participant_2.eq.${currentUserId})`
              )
              .maybeSingle();

            let convId: string;
            if (existing) {
              convId = existing.id;
            } else {
              const { data: newConv } = await supabase
                .from("conversations")
                .insert({
                  participant_1: currentUserId < item.user_id ? currentUserId : item.user_id,
                  participant_2: currentUserId < item.user_id ? item.user_id : currentUserId,
                })
                .select("id")
                .single();
              convId = newConv?.id ?? "";
            }

            // Anbieter benachrichtigen
            createNotification({
              userId: item.user_id,
              type: "leihboerse",
              title: "Anfrage zu Ihrem Leih-Angebot",
              body: `Jemand interessiert sich für „${item.title}".`,
              referenceId: item.id,
              referenceType: "leihboerse_item",
            });

            if (convId) router.push(`/messages/${convId}`);
          }}
          className="w-full bg-quartier-green hover:bg-quartier-green-dark"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Nachricht senden
        </Button>
      )}

      {isOwner && item.status === "active" && (
        <Button variant="outline" onClick={async () => {
          const supabase = createClient();
          await supabase.from("leihboerse_items").update({ status: "done" }).eq("id", item.id);
          router.push("/leihboerse");
        }} className="w-full">
          Als erledigt markieren
        </Button>
      )}
    </div>
  );
}
