import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/news/rss
 *
 * RSS-Feed-Aggregator fuer lokale Nachrichtenquellen.
 * Liest RSS-Feeds von konfigurierten Quellen und importiert
 * relevante Artikel in die news_items-Tabelle.
 *
 * Unterstuetzte Quellen:
 * - Suedkurier Bad Saeckingen
 * - Badische Zeitung (Hochrhein)
 *
 * DSGVO: NUR oeffentliche Nachrichtentexte.
 * KEINE personenbezogenen Daten werden verarbeitet.
 */

// Konfigurierbare RSS-Quellen
const RSS_SOURCES = [
  {
    name: "Suedkurier Bad Saeckingen",
    url: "https://www.suedkurier.de/region/hochrhein/bad-saeckingen/rss.feed",
    category: "other",
  },
  {
    name: "Badische Zeitung Hochrhein",
    url: "https://www.badische-zeitung.de/rss/hochrhein.xml",
    category: "other",
  },
];

// Kategorie-Keywords (gleich wie im Scraper)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  infrastructure: [
    "bahn", "strasse", "kanal", "baustelle", "sperrung", "glasfaser",
    "telekom", "wasser", "strom", "bus", "verkehr", "brücke",
  ],
  events: [
    "versteigerung", "fest", "markt", "veranstaltung", "konzert", "feier",
    "flohmarkt", "wochenmarkt",
  ],
  administration: [
    "satzung", "gemeinderat", "ortschaftsrat", "bekanntmachung", "wahl",
    "sitzung", "beschluss", "verordnung", "rathaus",
  ],
  weather: ["wetter", "unwetter", "sturm", "hochwasser", "frost", "hitze"],
  waste: ["abfall", "müll", "gelber sack", "sperrmüll", "entsorgung", "recycling"],
};

function guessCategory(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return category;
    }
  }
  return "other";
}

function estimateRelevance(title: string, description: string): number {
  const text = `${title} ${description}`.toLowerCase();
  let score = 4; // Niedrigere Basis fuer externe Quellen

  // Erhoehung bei Quartiers-Bezug
  if (/bad säckingen|bad saeckingen/.test(text)) score += 2;
  if (/purkersdorf|sanary|rebberg/.test(text)) score += 3;
  if (/glasfaser|strom|wasser|kanal|strass/.test(text)) score += 1;
  if (/sperrung|umleitung|baustelle/.test(text)) score += 1;

  // Erniedrigung bei wenig Relevanz
  if (/sport|fussball|handball|tennis/.test(text)) score -= 1;
  if (/bundesweit|deutschland|berlin/.test(text)) score -= 2;

  return Math.min(10, Math.max(1, score));
}

// XML-Parser (einfach, ohne externe Abhaengigkeit)
function parseRSSItems(xml: string): Array<{
  title: string;
  description: string;
  link: string;
  pubDate: string;
}> {
  const items: Array<{
    title: string;
    description: string;
    link: string;
    pubDate: string;
  }> = [];

  // Alle <item>-Bloecke extrahieren
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const linkMatch = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    if (titleMatch) {
      const title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
      const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";
      const link = linkMatch ? linkMatch[1].trim() : "";
      const pubDate = dateMatch ? dateMatch[1].trim() : "";

      if (title.length > 5) {
        items.push({ title, description, link, pubDate });
      }
    }
  }

  return items;
}

export async function GET(request: Request) {
  // Auth-Check: Nur via Cron-Secret oder Admin
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET nicht konfiguriert — RSS-Endpunkt blockiert");
    return NextResponse.json({ error: "Server nicht konfiguriert" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    // Fallback: Admin-Check via Supabase
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Nur Admins" }, { status: 403 });
    }
  }

  const supabase = await createClient();

  // Quartier-ID fuer Bad Saeckingen Pilot ermitteln
  const { data: pilotQuarter } = await supabase
    .from("quarters")
    .select("id")
    .eq("slug", "bad-saeckingen-pilot")
    .single();
  const quarterId = pilotQuarter?.id ?? null;

  // Bestehende Titel laden (Duplikat-Check)
  const { data: existingNews } = await supabase
    .from("news_items")
    .select("original_title")
    .order("created_at", { ascending: false })
    .limit(200);

  const existingTitles = new Set(
    (existingNews || []).map((n: { original_title: string }) =>
      n.original_title.toLowerCase().trim()
    )
  );

  const results: {
    source: string;
    fetched: number;
    imported: number;
    errors: string[];
  }[] = [];

  const apiKey = process.env.ANTHROPIC_API_KEY;

  for (const source of RSS_SOURCES) {
    const sourceResult = { source: source.name, fetched: 0, imported: 0, errors: [] as string[] };

    try {
      const response = await fetch(source.url, {
        headers: {
          "User-Agent": "quartierapp-newsbot/1.0 (Community-App Bad Saeckingen)",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
        next: { revalidate: 0 },
      });

      if (!response.ok) {
        sourceResult.errors.push(`HTTP ${response.status}`);
        results.push(sourceResult);
        continue;
      }

      const xml = await response.text();
      const items = parseRSSItems(xml);
      sourceResult.fetched = items.length;

      // Nur Artikel mit Bad-Saeckingen-Bezug filtern
      const relevantItems = items.filter((item) => {
        const text = `${item.title} ${item.description}`.toLowerCase();
        return (
          text.includes("bad säckingen") ||
          text.includes("bad saeckingen") ||
          text.includes("hochrhein") ||
          text.includes("waldshut") ||
          text.includes("purkersdorf") ||
          text.includes("sanary") ||
          text.includes("rebberg")
        );
      });

      for (const item of relevantItems) {
        // Duplikat-Check
        if (existingTitles.has(item.title.toLowerCase().trim())) continue;

        let category = guessCategory(item.title, item.description);
        let summary = item.description.length > 200
          ? item.description.substring(0, 200) + "..."
          : item.description;
        let relevance = estimateRelevance(item.title, item.description);

        // Optional: Claude API fuer bessere Zusammenfassung
        if (apiKey && item.description.length > 30) {
          try {
            const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
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
                    content: `Du bist ein Redakteur fuer das Quartier Purkersdorfer-/Sanary-/Rebbergstrasse in Bad Saeckingen. Fasse diese Nachricht in max. 2 Saetzen zusammen. Bewerte Relevanz fuer Quartierbewohner von 0-10. Antworte nur in JSON.

Titel: ${item.title}
Inhalt: ${item.description}
Quelle: ${source.name}

Format: {"summary": "...", "relevance_score": 0, "category": "infrastructure|events|administration|weather|waste|other"}`,
                  },
                ],
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const text = aiData.content?.[0]?.text;
              if (text) {
                const parsed = JSON.parse(text);
                summary = parsed.summary || summary;
                category = parsed.category || category;
                relevance = Math.min(10, Math.max(0, parsed.relevance_score ?? relevance));
              }
            }
          } catch {
            // Fallback ohne KI
          }
        }

        // Nur Artikel mit Mindest-Relevanz eintragen
        if (relevance < 4) continue;

        // Datum parsen
        let publishedAt: string | null = null;
        if (item.pubDate) {
          try {
            publishedAt = new Date(item.pubDate).toISOString();
          } catch {
            publishedAt = new Date().toISOString();
          }
        }

        const { error } = await supabase.from("news_items").insert({
          source_url: item.link || source.url,
          original_title: item.title,
          ai_summary: summary,
          category,
          relevance_score: relevance,
          published_at: publishedAt || new Date().toISOString(),
          quarter_id: quarterId,
        });

        if (error) {
          sourceResult.errors.push(`DB-Fehler: ${error.message}`);
        } else {
          sourceResult.imported++;
          existingTitles.add(item.title.toLowerCase().trim());
        }
      }
    } catch (err) {
      sourceResult.errors.push(`Fetch-Fehler: ${err instanceof Error ? err.message : "unbekannt"}`);
    }

    results.push(sourceResult);
  }

  const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
  const totalFetched = results.reduce((sum, r) => sum + r.fetched, 0);

  return NextResponse.json({
    message: `${totalImported} neue Artikel aus ${results.length} RSS-Quellen importiert`,
    total_fetched: totalFetched,
    total_imported: totalImported,
    sources: results,
  });
}
