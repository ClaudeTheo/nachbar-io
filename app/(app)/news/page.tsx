"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { NewsCard } from "@/components/NewsCard";
import { createClient } from "@/lib/supabase/client";
import type { NewsItem } from "@/lib/supabase/types";

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNews() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("news_items")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNews(data);
    setLoading(false);
  }

  useEffect(() => {
    loadNews();
  }, []);

  return (
    <div>
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
      <p className="mb-4 text-sm text-muted-foreground">
        Automatisch aufbereitete lokale Nachrichten für Ihr Quartier.
      </p>

      {news.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-2 text-4xl">📰</div>
          <p className="text-muted-foreground">
            {loading ? "Nachrichten werden geladen..." : "Noch keine Nachrichten vorhanden."}
          </p>
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
