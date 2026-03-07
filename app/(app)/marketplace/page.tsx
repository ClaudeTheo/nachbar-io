"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MARKETPLACE_TYPES, MARKETPLACE_CATEGORIES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { MarketplaceItem } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function MarketplacePage() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [filterType, setFilterType] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      let query = supabase
        .from("marketplace_items")
        .select("*, user:users(display_name, avatar_url)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (filterType) {
        query = query.eq("type", filterType);
      }

      const { data } = await query;
      if (data) setItems(data as unknown as MarketplaceItem[]);
    }
    load();
  }, [filterType]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-anthrazit">Marktplatz</h1>
        <Link
          href="/marketplace/new"
          className="flex items-center gap-1 rounded-lg bg-quartier-green px-3 py-2 text-sm font-semibold text-white hover:bg-quartier-green-dark"
        >
          <Plus className="h-4 w-4" />
          Inserat
        </Link>
      </div>

      {/* Filter-Chips */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterType(null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            !filterType ? "bg-anthrazit text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Alle
        </button>
        {MARKETPLACE_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setFilterType(type.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filterType === type.id
                ? "bg-anthrazit text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {type.icon} {type.label}
          </button>
        ))}
      </div>

      {/* Inserate */}
      {items.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-2 text-4xl">🏪</div>
          <p className="text-muted-foreground">Noch keine Inserate vorhanden.</p>
          <Link href="/marketplace/new" className="mt-2 inline-block text-sm text-quartier-green hover:underline">
            Erstellen Sie das erste Inserat.
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <MarketplaceCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function MarketplaceCard({ item }: { item: MarketplaceItem }) {
  const type = MARKETPLACE_TYPES.find((t) => t.id === item.type);
  const category = MARKETPLACE_CATEGORIES.find((c) => c.id === item.category);
  const timeAgo = formatDistanceToNow(new Date(item.created_at), {
    addSuffix: true,
    locale: de,
  });

  return (
    <Link
      href={`/marketplace/${item.id}`}
      className="block rounded-lg border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex gap-3">
        {/* Bild-Platzhalter */}
        {item.images && item.images.length > 0 ? (
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
            <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
            {type?.icon ?? "📦"}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-anthrazit">{item.title}</h3>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary">{type?.label}</Badge>
            {category && <span className="text-xs text-muted-foreground">{category.label}</span>}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-bold text-anthrazit">
              {item.price ? `${item.price} €` : item.type === "give" ? "Geschenkt" : ""}
            </span>
            <span className="text-xs text-muted-foreground">
              {item.user?.display_name} · {timeAgo}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
