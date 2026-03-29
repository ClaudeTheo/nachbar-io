// Nachbar.io — Service fuer KI-Newsaggregation via Claude API
// DSGVO-Regel: NUR oeffentliche Nachrichtentexte werden an die API gesendet.
// KEINE personenbezogenen Daten, KEINE Adressdaten, KEINE Nutzerdaten.

import type { SupabaseClient } from "@supabase/supabase-js";

/** Ergebnis einer einzelnen News-Aggregation */
interface AggregatedNewsItem {
  id?: string;
  source_url: string;
  original_title: string;
  ai_summary: string;
  category: string;
  relevance_score: number;
  published_at: string;
  quarter_id: string | null;
}

/** Ergebnis der gesamten Aggregation */
interface AggregationResult {
  processed: number;
  results: AggregatedNewsItem[];
}

/**
 * Fuehrt die KI-Newsaggregation fuer das Pilotquartier durch.
 * Wird als Cron-Job aufgerufen.
 *
 * Beispiel-Nachricht fuer MVP — spaeter durch RSS-Scraping ersetzen.
 */
export async function runNewsAggregation(
  supabase: SupabaseClient,
): Promise<AggregationResult> {
  // Quartier-ID fuer Bad Saeckingen Pilot ermitteln
  const { data: pilotQuarter } = await supabase
    .from("quarters")
    .select("id")
    .eq("slug", "bad-saeckingen-pilot")
    .single();
  const quarterId = pilotQuarter?.id ?? null;

  // Beispiel-Nachricht fuer MVP (spaeter durch RSS-Scraping ersetzen)
  const sampleNews = [
    {
      source_url: "https://www.bad-saeckingen.de",
      original_title: "Kanalarbeiten Sanarystraße ab Montag",
      content:
        "Ab kommendem Montag wird die Sanarystraße wegen Kanalarbeiten halbseitig gesperrt. Die Arbeiten dauern voraussichtlich 3 Tage. Anwohner werden gebeten, alternative Routen zu nutzen.",
    },
  ];

  const results: AggregatedNewsItem[] = [];

  for (const news of sampleNews) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "placeholder-api-key") {
      console.error("ANTHROPIC_API_KEY nicht konfiguriert");
      continue;
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: `Du bist ein Redakteur für das Quartier Purkersdorfer-/Sanary-/Rebbergstraße in Bad Säckingen. Fasse diese Nachricht in max. 2 Sätzen zusammen. Bewerte Relevanz für Quartierbewohner von 0-10. Antworte nur in JSON.

Nachricht: ${news.content}

Format: {"summary": "...", "relevance_score": 0, "category": "infrastructure|events|administration|weather|waste|other"}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error("Claude API Fehler:", response.status);
        continue;
      }

      const data = await response.json();
      const text = data.content?.[0]?.text;

      if (text) {
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          console.error(
            "Claude-Antwort kein gültiges JSON:",
            text.substring(0, 100),
          );
          continue;
        }

        const { data: inserted } = await supabase
          .from("news_items")
          .insert({
            source_url: news.source_url,
            original_title: news.original_title,
            ai_summary: parsed.summary,
            category: parsed.category || "other",
            relevance_score: Math.min(10, Math.max(0, parsed.relevance_score)),
            published_at: new Date().toISOString(),
            quarter_id: quarterId,
          })
          .select()
          .single();

        if (inserted) results.push(inserted);
      }
    } catch (err) {
      console.error("News-Aggregation fehlgeschlagen:", err);
    }
  }

  return { processed: results.length, results };
}
