import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/news/aggregate
 *
 * KI-Newsaggregation via Claude API.
 * Wird als Cron-Job aufgerufen — geschuetzt per CRON_SECRET.
 *
 * DSGVO-Regel: NUR oeffentliche Nachrichtentexte werden an die API gesendet.
 * KEINE personenbezogenen Daten, KEINE Adressdaten, KEINE Nutzerdaten.
 */
export async function POST(request: NextRequest) {
  // Auth: Per CRON_SECRET oder Admin-Session
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  const supabase = await createClient();

  if (!isCron) {
    // Fallback: Admin-Check via Session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Nur Admins" }, { status: 403 });
    }
  }

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

  const results = [];

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
          console.error("Claude-Antwort kein gueltiges JSON:", text.substring(0, 100));
          continue;
        }

        const { data: inserted } = await supabase.from("news_items").insert({
          source_url: news.source_url,
          original_title: news.original_title,
          ai_summary: parsed.summary,
          category: parsed.category || "other",
          relevance_score: Math.min(10, Math.max(0, parsed.relevance_score)),
          published_at: new Date().toISOString(),
          quarter_id: quarterId,
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
