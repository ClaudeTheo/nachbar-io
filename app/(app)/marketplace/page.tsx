"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { MARKETPLACE_TYPES, MARKETPLACE_CATEGORIES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";
import type { MarketplaceItem } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { LargeTitle } from "@/components/ui/LargeTitle";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

export default function MarketplacePage() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentQuarter } = useQuarter();

  useEffect(() => {
    if (!currentQuarter) return;
    async function load() {
      setLoading(true);
      const supabase = createClient();
      let query = supabase
        .from("marketplace_items")
        .select("*, user:users(display_name, avatar_url)")
        .eq("quarter_id", currentQuarter!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (filterType) {
        query = query.eq("type", filterType);
      }

      const { data } = await query;
      if (data) setItems(data as unknown as MarketplaceItem[]);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, currentQuarter?.id]);

  return (
    <div>
      <LargeTitle title="Marktplatz" subtitle="Kaufen, verschenken, tauschen" />
      <PageHeader
        title=""
        backHref="/dashboard"
        className="mb-4"
        actions={
          <Link
            href="/marketplace/new"
            className="flex items-center gap-1 rounded-lg bg-quartier-green px-3 py-2 text-sm font-semibold text-white hover:bg-quartier-green-dark"
          >
            <Plus className="h-4 w-4" />
            Inserat
          </Link>
        }
      />

      {/* Segmented Filter */}
      <SegmentedControl
        items={[
          "Alle",
          ...MARKETPLACE_TYPES.map((t) => `${t.icon} ${t.label}`),
        ]}
        active={
          filterType
            ? `${MARKETPLACE_TYPES.find((t) => t.id === filterType)?.icon} ${MARKETPLACE_TYPES.find((t) => t.id === filterType)?.label}`
            : "Alle"
        }
        onChange={(value) => {
          if (value === "Alle") {
            setFilterType(null);
          } else {
            const match = MARKETPLACE_TYPES.find(
              (t) => `${t.icon} ${t.label}` === value,
            );
            setFilterType(match?.id ?? null);
          }
        }}
        className="mb-4"
      />

      {/* Inserate */}
      {loading ? (
        <div className="mt-4 divide-y divide-[#ebe5dd]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-4">
              <div className="flex gap-3">
                <div className="h-20 w-20 shrink-0 animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-2 text-4xl">🏪</div>
          <p className="text-muted-foreground">
            Noch keine Inserate vorhanden.
          </p>
          <Link
            href="/marketplace/new"
            className="mt-2 inline-block text-sm text-quartier-green hover:underline"
          >
            Erstellen Sie das erste Inserat.
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-[#ebe5dd]">
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
      className="block px-4 py-4 transition-colors active:bg-[#f5f0eb]"
    >
      <div className="flex gap-3">
        {/* Bild-Platzhalter */}
        {item.images && item.images.length > 0 ? (
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.images[0]}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
            {type?.icon ?? "📦"}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-anthrazit">
              {item.title}
            </h3>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary">{type?.label}</Badge>
            {category && (
              <span className="text-xs text-muted-foreground">
                {category.label}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-bold text-anthrazit">
              {item.price
                ? `${item.price} €`
                : item.type === "give"
                  ? "Geschenkt"
                  : ""}
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
