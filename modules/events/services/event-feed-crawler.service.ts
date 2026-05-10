// modules/events/services/event-feed-crawler.service.ts
// Welle W10 — Event-Feed-Crawler.
//
// Liest RSS- und/oder iCal-Feeds (typischerweise vom Welle-J-Prober gefunden),
// normalisiert beide Formate auf CrawledEvent[], filtert nach Datum-Range,
// dedupliziert. Wirft NICHT — Fehler kommen in errors[].
//
// Persistenz ist NICHT Teil dieser Welle (events-Tabelle hat user_id NOT NULL,
// municipal_config.events ist fuer regelmaessige Events). Caller (z.B. Admin-API)
// entscheidet ueber Speicherform.

import {
  parseIcalFeed,
  type IcalEvent,
} from "@/lib/feeds/ical-parser";
import { parseRssFeed, type RssItem } from "@/lib/feeds/rss-parser";

export interface CrawledEvent {
  source: "rss" | "ical";
  feedUrl: string;
  uid: string | null; // Stable identifier from feed (guid for RSS, UID for iCal)
  title: string;
  description: string | null;
  location: string | null;
  startDate: string; // ISO 8601 oder YYYY-MM-DD
  endDate: string | null;
  link: string | null;
  isAllDay: boolean;
}

export interface CrawlOptions {
  rssUrl?: string | null;
  icalUrl?: string | null;
  /** Filter: nur Events >= fromDate. */
  fromDate?: Date;
  /** Filter: nur Events <= toDate. */
  toDate?: Date;
  /** Dependency-Injection fuer Tests. */
  fetch?: typeof fetch;
  /** Timeout pro Request in ms. Default 10000. */
  timeoutMs?: number;
}

export interface CrawlResult {
  events: CrawledEvent[];
  errors: string[];
  fetchedFromRss: number;
  fetchedFromIcal: number;
}

function rssToCrawled(item: RssItem, feedUrl: string): CrawledEvent | null {
  // Ohne pubDate koennen wir nichts mit dem Event anfangen.
  if (!item.pubDate) return null;
  return {
    source: "rss",
    feedUrl,
    uid: item.guid,
    title: item.title,
    description: item.description,
    location: null,
    startDate: item.pubDate,
    endDate: null,
    link: item.link,
    isAllDay: false,
  };
}

function icalToCrawled(event: IcalEvent, feedUrl: string): CrawledEvent {
  return {
    source: "ical",
    feedUrl,
    uid: event.uid,
    title: event.summary,
    description: event.description,
    location: event.location,
    startDate: event.startDate,
    endDate: event.endDate,
    link: null,
    isAllDay: event.isAllDay,
  };
}

function inDateRange(event: CrawledEvent, from?: Date, to?: Date): boolean {
  if (!from && !to) return true;
  // startDate ist entweder "YYYY-MM-DD" (all-day) oder ISO-8601.
  // Date-Konstruktor parsiert beides.
  const start = new Date(event.startDate);
  if (Number.isNaN(start.getTime())) return true; // konservativ behalten
  if (from && start < from) return false;
  if (to && start > to) return false;
  return true;
}

function dedupeKey(event: CrawledEvent): string {
  // Title + startDate-Tag (YYYY-MM-DD) — ignoriert Uhrzeit fuer Dedupe ueber
  // Quellen, die das gleiche Event mit/ohne Zeit haben.
  const day = event.startDate.slice(0, 10);
  return `${event.title.toLowerCase().trim()}|${day}`;
}

async function fetchWithTimeout(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<Response> {
  return fetchImpl(url, {
    method: "GET",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "User-Agent":
        "quartierapp-eventbot/1.0 (Quartier-Events-Crawler)",
    },
  });
}

export async function crawlEventFeeds(
  options: CrawlOptions,
): Promise<CrawlResult> {
  const fetchImpl = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10000;
  const errors: string[] = [];
  let fetchedFromRss = 0;
  let fetchedFromIcal = 0;
  const collected: CrawledEvent[] = [];

  if (options.rssUrl) {
    try {
      const res = await fetchWithTimeout(options.rssUrl, fetchImpl, timeoutMs);
      if (!res.ok) {
        errors.push(`RSS ${options.rssUrl}: HTTP ${res.status}`);
      } else {
        const xml = await res.text();
        const items = parseRssFeed(xml);
        fetchedFromRss = items.length;
        for (const item of items) {
          const ev = rssToCrawled(item, options.rssUrl);
          if (ev) collected.push(ev);
        }
      }
    } catch (err) {
      errors.push(
        `RSS ${options.rssUrl}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (options.icalUrl) {
    try {
      const res = await fetchWithTimeout(options.icalUrl, fetchImpl, timeoutMs);
      if (!res.ok) {
        errors.push(`iCal ${options.icalUrl}: HTTP ${res.status}`);
      } else {
        const text = await res.text();
        const events = parseIcalFeed(text);
        fetchedFromIcal = events.length;
        for (const event of events) {
          collected.push(icalToCrawled(event, options.icalUrl));
        }
      }
    } catch (err) {
      errors.push(
        `iCal ${options.icalUrl}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Filter Datum-Range
  const filtered = collected.filter((e) =>
    inDateRange(e, options.fromDate, options.toDate),
  );

  // Dedupe (erstes gewinnt)
  const seen = new Set<string>();
  const deduped: CrawledEvent[] = [];
  for (const ev of filtered) {
    const key = dedupeKey(ev);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(ev);
  }

  return {
    events: deduped,
    errors,
    fetchedFromRss,
    fetchedFromIcal,
  };
}
