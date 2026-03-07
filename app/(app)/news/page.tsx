"use client";

import { useEffect, useState } from "react";
import { NewsCard } from "@/components/NewsCard";
import { createClient } from "@/lib/supabase/client";
import type { NewsItem } from "@/lib/supabase/types";

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("news_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setNews(data);
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-anthrazit">Quartiersnews</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Automatisch aufbereitete lokale Nachrichten für Ihr Quartier.
      </p>

      {news.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-2 text-4xl">📰</div>
          <p className="text-muted-foreground">Noch keine Nachrichten vorhanden.</p>
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
