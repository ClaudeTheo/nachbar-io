// lib/feeds/rss-parser.ts
// Welle W10 — Generischer RSS-2.0 + Atom-Feed-Parser fuer Event-Crawling.
//
// Hinweis: news-rss.service.ts hat einen privaten parseRSSItems(xml) der
// News-spezifisch ist (description-Truncate, BadSaeckingen-Filter im Caller).
// Dieser Parser ist generisch — eine Funktion, exportiert, RSS+Atom-faehig.
//
// Bewusst KEIN externer Dependency wie fast-xml-parser: Repo nutzt aktuell
// Regex-basiertes Parsing (siehe news-rss.service.ts), bleibt portabel.

export interface RssItem {
  title: string;
  link: string;
  description: string | null;
  pubDate: string | null; // ISO 8601 oder null
  guid: string | null;
}

function decodeCdata(input: string): string {
  return input.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, "").trim();
}

function extractTagContent(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  if (!m) return null;
  return decodeCdata(m[1].trim());
}

function parseDate(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseRssChannel(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;

  for (const match of xml.matchAll(itemRe)) {
    const block = match[1];

    const title = extractTagContent(block, "title");
    const link = extractTagContent(block, "link");
    const description = extractTagContent(block, "description");
    const pubDate = extractTagContent(block, "pubDate");
    const guid = extractTagContent(block, "guid");

    if (!title || !link) continue;

    const cleanTitle = stripHtml(title);
    const cleanLink = stripHtml(link);
    if (cleanTitle.length === 0 || cleanLink.length === 0) continue;

    items.push({
      title: cleanTitle,
      link: cleanLink,
      description: description ? stripHtml(description) : null,
      pubDate: parseDate(pubDate),
      guid: guid ? stripHtml(guid) : null,
    });
  }

  return items;
}

function parseAtomFeed(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const entryRe = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;

  for (const match of xml.matchAll(entryRe)) {
    const block = match[1];

    const title = extractTagContent(block, "title");
    // Atom-Link ist ein self-closing Tag mit href-Attribut: <link href="..."/>
    const linkMatch = block.match(/<link\b[^>]*href="([^"]+)"/i);
    const link = linkMatch ? linkMatch[1] : null;
    const summary =
      extractTagContent(block, "summary") || extractTagContent(block, "content");
    const published =
      extractTagContent(block, "published") || extractTagContent(block, "updated");
    const id = extractTagContent(block, "id");

    if (!title || !link) continue;

    const cleanTitle = stripHtml(title);
    if (cleanTitle.length === 0) continue;

    items.push({
      title: cleanTitle,
      link: link.trim(),
      description: summary ? stripHtml(summary) : null,
      pubDate: parseDate(published),
      guid: id ? stripHtml(id) : null,
    });
  }

  return items;
}

/**
 * Parst RSS 2.0 oder Atom-Feed. Liefert leeres Array bei Fehler/Unbekanntem
 * Format. Macht KEINE Filterung — der Crawler-Service entscheidet, welche
 * Items relevant sind.
 */
export function parseRssFeed(xml: string): RssItem[] {
  if (!xml || typeof xml !== "string") return [];
  if (/<feed\b[^>]*xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/i.test(xml)) {
    return parseAtomFeed(xml);
  }
  if (/<rss\b/i.test(xml) || /<channel\b/i.test(xml)) {
    return parseRssChannel(xml);
  }
  return [];
}
