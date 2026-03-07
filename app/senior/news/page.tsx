"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NewsItem } from "@/lib/supabase/types";

// Seniorenmodus — Nur die wichtigsten Nachrichten, große Schrift
export default function SeniorNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("news_items")
        .select("*")
        .gte("relevance_score", 7)
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) setNews(data);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <p className="senior-heading text-center text-anthrazit">
        Wichtige Nachrichten
      </p>

      {news.length === 0 ? (
        <div className="py-8 text-center">
          <p className="senior-text text-muted-foreground">
            Keine neuen Nachrichten.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {news.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border-2 border-border bg-white p-5"
            >
              <h3 className="senior-text font-bold text-anthrazit">
                {item.original_title}
              </h3>
              <p className="mt-2 senior-text text-muted-foreground">
                {item.ai_summary}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
