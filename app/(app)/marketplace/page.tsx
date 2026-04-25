"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { MARKETPLACE_TYPES, MARKETPLACE_CATEGORIES } from "@/modules/marketplace";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";
import type { MarketplaceItem } from "@/modules/marketplace";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { LargeTitle } from "@/components/ui/LargeTitle";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

const MARKETPLACE_FILTERS = [
  { label: "Verschenken", type: "give" },
  { label: "Verleihen", type: "lend" },
  { label: "Gesucht", type: "search" },
  { label: "Verkaufen", type: "sell" },
];

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
      <LargeTitle
        title="Quartier-Marktplatz"
        subtitle="Ausleihen, verschenken, suchen oder verkaufen im Quartier"
      />
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

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-quartier-green/20 bg-quartier-green/5 px-3 py-2 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-quartier-green" />
        <p>
          Nur verifizierte Nachbarn im eigenen Quartier sehen diese Inserate.
          Telefonnummer und Adresse bleiben privat.
        </p>
      </div>

      {/* Segmented Filter */}
      <SegmentedControl
        items={["Alles", ...MARKETPLACE_FILTERS.map((t) => t.label)]}
        active={
          filterType
            ? (MARKETPLACE_FILTERS.find((t) => t.type === filterType)?.label ??
              "Alles")
            : "Alles"
        }
        onChange={(value) => {
          if (value === "Alles") {
            setFilterType(null);
          } else {
            const match = MARKETPLACE_FILTERS.find((t) => t.label === value);
            setFilterType(match?.type ?? null);
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
        <div className="py-10 text-center">
          <div className="mb-2 text-4xl">🏘️</div>
          <h2 className="font-semibold text-anthrazit">
            Noch keine Inserate im Quartier.
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Starten Sie mit etwas Alltäglichem: Bohrmaschine verleihen, Leiter
            gesucht oder Pflanzen verschenken.
          </p>
          <Link
            href="/marketplace/new"
            className="mt-3 inline-block text-sm font-semibold text-quartier-green hover:underline"
          >
            Erstes Inserat erstellen
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
