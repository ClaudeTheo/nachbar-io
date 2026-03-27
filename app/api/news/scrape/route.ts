import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/news/scrape
 *
 * Wöchentlicher Scraper für Neuigkeiten von bad-saeckingen.de.
 * Wird als Vercel Cron-Job jeden Montag um 07:00 aufgerufen.
 *
 * Ablauf:
 * 1. HTML der Neuigkeiten-Seite abrufen
 * 2. Artikel-Daten extrahieren (Titel, Datum, Beschreibung, Kategorie)
 * 3. Prüfen ob bereits in DB vorhanden (Duplikat-Check über original_title)
 * 4. Neue Artikel optional via Claude API zusammenfassen
 * 5. In news_items eintragen
 *
 * DSGVO: NUR öffentliche Nachrichtentexte der Stadtverwaltung.
 * KEINE personenbezogenen Daten werden verarbeitet.
 */

const NEWS_URL = "https://www.bad-saeckingen.de/rathaus-service/aktuelles/neuigkeiten";

// Kategorie-Mapping: Stichwort -> DB-Kategorie
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  infrastructure: [
    "bahn", "straße", "kanal", "baustelle", "sperrung", "glasfaser",
    "telekom", "wasser", "strom", "bus", "verkehr", "fahrgast", "brücke",
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

// Relevanz-Bewertung basierend auf Stichworten
function guessCategory(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return category;
    }
  }
  return "other";
}

// Relevanz für das Quartier schätzen (0-10)
function estimateRelevance(title: string, description: string): number {
  const text = `${title} ${description}`.toLowerCase();
  let score = 5; // Basis-Relevanz

  // Erhöhung bei lokaler Infrastruktur
  if (/glasfaser|strom|wasser|kanal|strass/.test(text)) score += 2;
  if (/purkersdorf|sanary|rebberg/.test(text)) score += 3; // Direkt im Quartier
  if (/bad säckingen|bad saeckingen/.test(text)) score += 1;
  if (/sperrung|umleitung|baustelle/.test(text)) score += 1;

  // Erniedrigung bei wenig Quartiersrelevanz
  if (/satzung|bekanntmachung|beschluss/.test(text)) score -= 1;
  if (/ortschaftsrat|feuerwehr|personal/.test(text)) score -= 1;

  return Math.min(10, Math.max(1, score));
}

// HTML parsen und Artikel extrahieren
function parseNewsArticles(html: string): Array<{
  title: string;
  description: string;
  date: string;
  tags: string[];
}> {
  const articles: Array<{
    title: string;
    description: string;
    date: string;
    tags: string[];
  }> = [];

  // Regex für die Artikel-Bloecke der Bad Säckingen Seite
  // Typische Struktur: <h2>Titel</h2> ... <span class="tag">Aktuelles</span> ... Datum ... Beschreibung
  const _articleRegex = /<div[^>]*class="[^"]*teaser[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
  const _titleRegex = /<h[23][^>]*>\s*([\s\S]*?)\s*<\/h[23]>/i;
  const _dateRegex = /(\d{2}\.\d{2}\.\d{4})/;
  const _descRegex = /<p[^>]*>\s*([\s\S]*?)\s*<\/p>/gi;
  const _tagRegex = /<span[^>]*class="[^"]*tag[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;

  // Alternativ: Einfacherer Ansatz — nach den bekannten Strukturen suchen
  // Die Seite hat Artikel-Karten mit Titeln in <h2>, Datum und Beschreibungen
  const _simpleArticleRegex = /<h2[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/h2>|<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const _matches: string[] = [];
  let _match: RegExpExecArray | null;

  // Gesamten HTML in Bloecke aufteilen
  const sections = html.split(/<hr|<div[^>]*class="[^"]*teaser-divider/i);

  for (const section of sections) {
    // Titel finden
    const titleMatch = section.match(/<h2[^>]*>(?:<a[^>]*>)?\s*([\s\S]*?)\s*(?:<\/a>)?<\/h2>/i);
    if (!titleMatch) continue;

    const title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
    if (!title || title.length < 5) continue;

    // Datum
    const dateMatch = section.match(/(\d{2}\.\d{2}\.\d{4})/);
    const date = dateMatch ? dateMatch[1] : "";

    // Beschreibung (erster <p>-Tag nach dem Titel)
    const descMatches: string[] = [];
    let descMatch;
    const descSearchRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    while ((descMatch = descSearchRegex.exec(section)) !== null) {
      const text = descMatch[1].replace(/<[^>]+>/g, "").trim();
      if (text.length > 20 && !text.includes("Mehr erfahren")) {
        descMatches.push(text);
      }
    }
    const description = descMatches[0] || "";

    // Tags (Aktuelles, Bekanntgaben, etc.)
    const tags: string[] = [];
    let tagMatch;
    const tagSearchRegex = /<span[^>]*class="[^"]*tag[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
    while ((tagMatch = tagSearchRegex.exec(section)) !== null) {
      tags.push(tagMatch[1].replace(/<[^>]+>/g, "").trim());
    }

    articles.push({ title, description, date, tags });
  }

  // Fallback: Einfachere Text-basierte Extraktion
  if (articles.length === 0) {
    const textContent = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    // Suche nach Mustern: "Titel" gefolgt von "Aktuelles" und Datum
    const patternRegex = /([A-ZÄÖÜ][^.]{10,100}?)(?:\s+(?:Aktuelles|Bekanntgaben)[^.]*?)?\s+(?:icon\.crdate)?(\d{2}\.\d{2}\.\d{4})\s+([\s\S]{20,300}?)(?=Mehr erfahren|[A-ZÄÖÜ][^.]{10,100}?\s+(?:Aktuelles|Bekanntgaben)|\z)/gi;
    let pMatch;
    while ((pMatch = patternRegex.exec(textContent)) !== null) {
      articles.push({
        title: pMatch[1].trim(),
        description: pMatch[3].trim(),
        date: pMatch[2],
        tags: [],
      });
    }
  }

  return articles;
}

// Deutsches Datum (DD.MM.YYYY) in ISO-Datum konvertieren
function parseDateDE(dateStr: string): string | null {
  const match = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export async function GET(request: Request) {
  // Auth-Check: Nur via Cron-Secret oder Admin
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET nicht konfiguriert — Scrape-Endpunkt blockiert");
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

  try {
    // 1. Neuigkeiten-Seite abrufen
    const response = await fetch(NEWS_URL, {
      headers: {
        "User-Agent": "quartierapp-newsbot/1.0 (Community-App Bad Säckingen)",
        "Accept": "text/html",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Seitenabruf fehlgeschlagen: ${response.status}` },
        { status: 502 }
      );
    }

    const html = await response.text();

    // 2. Artikel extrahieren
    const articles = parseNewsArticles(html);

    if (articles.length === 0) {
      return NextResponse.json({
        message: "Keine Artikel auf der Seite gefunden",
        processed: 0,
        new_items: 0,
      });
    }

    // 3. Bestehende Titel aus DB laden (Duplikat-Check)
    const supabase = await createClient();

    // Quartier-ID für Bad Säckingen Pilot ermitteln
    const { data: pilotQuarter } = await supabase
      .from("quarters")
      .select("id")
      .eq("slug", "bad-saeckingen-pilot")
      .single();
    const quarterId = pilotQuarter?.id ?? null;
    const { data: existingNews } = await supabase
      .from("news_items")
      .select("original_title")
      .order("created_at", { ascending: false })
      .limit(100);

    const existingTitles = new Set(
      (existingNews || []).map((n: { original_title: string }) =>
        n.original_title.toLowerCase().trim()
      )
    );

    // 4. Neue Artikel filtern und eintragen
    const newArticles = articles.filter(
      (a) => !existingTitles.has(a.title.toLowerCase().trim())
    );

    const inserted = [];
    const apiKey = process.env.ANTHROPIC_API_KEY;

    for (const article of newArticles) {
      const isoDate = parseDateDE(article.date);
      let category = guessCategory(article.title, article.description);
      let summary = article.description;
      let relevance = estimateRelevance(article.title, article.description);

      // Optional: Claude API für bessere Zusammenfassung
      if (apiKey && article.description.length > 30) {
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
                  content: `Du bist ein Redakteur für das Quartier Purkersdorfer-/Sanary-/Rebbergstraße in Bad Säckingen. Fasse diese Nachricht in max. 2 Sätzen zusammen. Bewerte Relevanz für Quartierbewohner von 0-10. Antworte nur in JSON.

Titel: ${article.title}
Inhalt: ${article.description}

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
          // Fallback: Ohne KI-Zusammenfassung weiterarbeiten
          console.warn("Claude API nicht verfügbar, nutze Fallback-Logik");
        }
      }

      // Nur relevante Artikel eintragen (Relevanz >= 4)
      if (relevance < 4) continue;

      const { data: insertedItem, error } = await supabase
        .from("news_items")
        .insert({
          source_url: NEWS_URL,
          original_title: article.title,
          ai_summary: summary,
          category,
          relevance_score: relevance,
          published_at: isoDate || new Date().toISOString(),
          quarter_id: quarterId,
        })
        .select()
        .single();

      if (error) {
        console.error(`Fehler bei "${article.title}":`, error.message);
        continue;
      }

      if (insertedItem) inserted.push(insertedItem);
    }

    return NextResponse.json({
      message: `${inserted.length} neue Neuigkeiten eingetragen`,
      processed: articles.length,
      duplicates: articles.length - newArticles.length,
      new_items: inserted.length,
      articles: inserted.map((a: { original_title: string; category: string; relevance_score: number }) => ({
        title: a.original_title,
        category: a.category,
        relevance: a.relevance_score,
      })),
    });
  } catch (err) {
    console.error("News-Scraper Fehler:", err);
    return NextResponse.json(
      { error: "Interner Fehler beim News-Scraping" },
      { status: 500 }
    );
  }
}
