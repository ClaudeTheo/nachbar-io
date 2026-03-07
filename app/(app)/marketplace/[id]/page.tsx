"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Tag, User, Trash2, CheckCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { MARKETPLACE_TYPES, MARKETPLACE_CATEGORIES } from "@/lib/constants";
import type { MarketplaceItem } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function MarketplaceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data } = await supabase
        .from("marketplace_items")
        .select("*, user:users(display_name, avatar_url)")
        .eq("id", id)
        .single();

      if (data) setItem(data as unknown as MarketplaceItem);
      setLoading(false);
    }
    load();
  }, [id]);

  const isOwner = currentUserId && item?.user_id === currentUserId;
  const type = item ? MARKETPLACE_TYPES.find((t) => t.id === item.type) : null;
  const category = item ? MARKETPLACE_CATEGORIES.find((c) => c.id === item.category) : null;

  async function handleMarkDone() {
    if (!item) return;
    const supabase = createClient();
    await supabase.from("marketplace_items").update({ status: "done" }).eq("id", item.id);
    setItem({ ...item, status: "done" as MarketplaceItem["status"] });
  }

  async function handleDelete() {
    if (!item) return;
    const supabase = createClient();
    await supabase.from("marketplace_items").delete().eq("id", item.id);
    router.push("/marketplace");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-40 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <Link href="/marketplace" className="flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Zurück zum Marktplatz
        </Link>
        <p className="text-center text-muted-foreground">Inserat nicht gefunden.</p>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: de });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/marketplace" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Inserat</h1>
      </div>

      {/* Bild / Platzhalter */}
      <div className="flex h-48 items-center justify-center rounded-xl bg-muted text-6xl">
        {item.images?.length > 0 ? (
          <img src={item.images[0]} alt={item.title} className="h-full w-full rounded-xl object-cover" />
        ) : (
          type?.icon ?? "📦"
        )}
      </div>

      {/* Details */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-anthrazit">{item.title}</h2>
          {item.price ? (
            <span className="text-xl font-bold text-quartier-green">{item.price} €</span>
          ) : item.type === "give" ? (
            <Badge className="bg-quartier-green">Geschenkt</Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{type?.icon} {type?.label}</Badge>
          {category && <Badge variant="outline">{category.label}</Badge>}
          {item.status !== "active" && (
            <Badge variant="outline">{item.status === "reserved" ? "Reserviert" : "Erledigt"}</Badge>
          )}
        </div>

        {item.description && (
          <p className="text-muted-foreground">{item.description}</p>
        )}

        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {item.user?.display_name ?? "Nachbar"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {timeAgo}
          </span>
        </div>
      </div>

      {/* Aktionen */}
      {isOwner && item.status === "active" && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleMarkDone} className="flex-1">
            <CheckCircle className="mr-2 h-4 w-4" />
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

      {!isOwner && item.status === "active" && (
        <Button className="w-full bg-quartier-green hover:bg-quartier-green-dark">
          <MessageCircle className="mr-2 h-4 w-4" />
          Nachbar kontaktieren
        </Button>
      )}
    </div>
  );
}
