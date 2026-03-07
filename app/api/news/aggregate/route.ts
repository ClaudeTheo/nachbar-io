import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/news/aggregate
 *
 * KI-Newsaggregation via Claude API.
 * Wird als Cron-Job täglich um 07:00 Uhr aufgerufen.
 *
 * DSGVO-Regel: NUR öffentliche Nachrichtentexte werden an die API gesendet.
 * KEINE personenbezogenen Daten, KEINE Adressdaten, KEINE Nutzerdaten.
 */
export async function POST() {
  const supabase = await createClient();

  // Hier würde normalerweise ein Scraping/Fetching der lokalen Nachrichtenquellen stattfinden
  // Für das MVP: Manuelle Nachrichten oder RSS-Feed von bad-saeckingen.de

  // Beispiel: Nachricht verarbeiten
  const sampleNews = [
    {
      source_url: "https://www.bad-saeckingen.de",
      original_title: "Kanalarbeiten Sanarystraße ab Montag",
      content:
        "Ab kommendem Montag wird die Sanarystraße wegen Kanalarbeiten halbseitig gesperrt. Die Arbeiten dauern voraussichtlich 3 Tage. Anwohner werden gebeten, alternative Routen zu nutzen.",
    },
  ];

  const results = [];

  for (const news of sampleNews) {
    // Claude API aufrufen (nur öffentliche Nachrichtentexte!)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
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
        const parsed = JSON.parse(text);

        // In Datenbank speichern
        const { data: inserted } = await supabase.from("news_items").insert({
          source_url: news.source_url,
          original_title: news.original_title,
          ai_summary: parsed.summary,
          category: parsed.category || "other",
          relevance_score: Math.min(10, Math.max(0, parsed.relevance_score)),
          published_at: new Date().toISOString(),
        }).select().single();

        if (inserted) results.push(inserted);
      }
    } catch (err) {
      console.error("News-Aggregation fehlgeschlagen:", err);
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
