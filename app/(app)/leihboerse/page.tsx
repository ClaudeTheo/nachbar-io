"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LEIHBOERSE_CATEGORIES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { LeihboerseItem } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

const TYPES = [
  { id: "lend", label: "Verleihen", icon: "🔄" },
  { id: "borrow", label: "Suche", icon: "🔍" },
] as const;

export default function LeihboersePage() {
  const [items, setItems] = useState<LeihboerseItem[]>([]);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      let query = supabase
        .from("leihboerse_items")
        .select("*, user:users(display_name, avatar_url)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (filterType) query = query.eq("type", filterType);
      if (filterCategory) query = query.eq("category", filterCategory);

      const { data } = await query;
      if (data) setItems(data as unknown as LeihboerseItem[]);
    }
    load();
  }, [filterType, filterCategory]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="rounded-lg p-2 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-anthrazit">Leihbörse</h1>
        </div>
        <Link
          href="/leihboerse/new"
          className="flex items-center gap-1 rounded-lg bg-quartier-green px-3 py-2 text-sm font-semibold text-white hover:bg-quartier-green-dark"
        >
          <Plus className="h-4 w-4" />
          Angebot
        </Link>
      </div>

      {/* Typ-Filter */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterType(null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            !filterType ? "bg-anthrazit text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Alle
        </button>
        {TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilterType(t.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filterType === t.id ? "bg-anthrazit text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Kategorie-Filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {LEIHBOERSE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilterCategory(filterCategory === c.id ? null : c.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filterCategory === c.id ? "bg-quartier-green text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Eintraege */}
      {items.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-2 text-4xl">🔄</div>
          <p className="text-muted-foreground">Noch keine Angebote vorhanden.</p>
          <Link href="/leihboerse/new" className="mt-2 inline-block text-sm text-quartier-green hover:underline">
            Erstellen Sie das erste Angebot.
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <LeihboerseCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function LeihboerseCard({ item }: { item: LeihboerseItem }) {
  const type = TYPES.find((t) => t.id === item.type);
  const category = LEIHBOERSE_CATEGORIES.find((c) => c.id === item.category);
  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: de });

  return (
    <Link
      href={`/leihboerse/${item.id}`}
      className="block rounded-lg border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
          {category?.icon ?? "📦"}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-anthrazit">{item.title}</h3>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={item.type === "lend" ? "default" : "secondary"}>
              {type?.label}
            </Badge>
            <span className="text-xs text-muted-foreground">{category?.label}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            {item.deposit && <span className="text-sm text-muted-foreground">Pfand: {item.deposit}</span>}
            <span className="ml-auto text-xs text-muted-foreground">
              {item.user?.display_name} · {timeAgo}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
