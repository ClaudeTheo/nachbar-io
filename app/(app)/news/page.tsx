"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Clock } from "lucide-react";
import { NewsCard } from "@/components/NewsCard";
import { createClient } from "@/lib/supabase/client";
import { NEWS_CATEGORIES } from "@/lib/constants";
import type { NewsItem } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadNews = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("news_items")
      .select("*")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(30);

    if (activeCategory !== "all") {
      query = query.eq("category", activeCategory);
    }

    const { data } = await query;
    if (data) setNews(data);
    setLastUpdated(new Date());
    setLoading(false);
  }, [activeCategory]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const filteredCount = news.length;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-anthrazit">Quartiersnews</h1>
        <button
          onClick={loadNews}
          disabled={loading}
          className="rounded-lg p-2 hover:bg-muted disabled:opacity-50"
          aria-label="Aktualisieren"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        Automatisch aufbereitete lokale Nachrichten für Ihr Quartier.
      </p>

      {/* Letzte Aktualisierung */}
      {lastUpdated && (
        <div className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            Zuletzt aktualisiert {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: de })}
          </span>
        </div>
      )}

      {/* Kategorie-Filter-Tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {NEWS_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === cat.id
                ? "bg-quartier-green text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Ergebnis-Anzahl */}
      {!loading && activeCategory !== "all" && (
        <p className="mb-3 text-xs text-muted-foreground">
          {filteredCount} {filteredCount === 1 ? "Nachricht" : "Nachrichten"} in dieser Kategorie
        </p>
      )}

      {/* Nachrichten-Liste */}
      {news.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-2 text-4xl">📰</div>
          <p className="text-muted-foreground">
            {loading
              ? "Nachrichten werden geladen..."
              : activeCategory !== "all"
                ? "Keine Nachrichten in dieser Kategorie."
                : "Noch keine Nachrichten vorhanden."}
          </p>
          {!loading && activeCategory !== "all" && (
            <button
              onClick={() => setActiveCategory("all")}
              className="mt-2 text-sm text-quartier-green hover:underline"
            >
              Alle Nachrichten anzeigen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {news.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
