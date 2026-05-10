// __tests__/modules/events/event-feed-crawler.service.test.ts
// Welle W10 — Event-Feed-Crawler: liest RSS- und iCal-Feeds und liefert
// normalisierte CrawledEvent-Liste zurueck. Greift auf Welle-J-Prober-URLs zu.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { crawlEventFeeds } from "@/modules/events/services/event-feed-crawler.service";

const RSS_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item>
    <title>Wochenmarkt</title>
    <link>https://example.test/event/1</link>
    <description>Frische Produkte</description>
    <pubDate>Sat, 16 May 2026 08:00:00 +0200</pubDate>
    <guid>rss-1</guid>
  </item>
  <item>
    <title>Sommerfest</title>
    <link>https://example.test/event/2</link>
    <pubDate>Sat, 06 Jun 2026 18:00:00 +0200</pubDate>
    <guid>rss-2</guid>
  </item>
</channel></rss>`;

const ICAL_BODY = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:ical-1
SUMMARY:Stadtputzete
LOCATION:Rathaus
DTSTART;VALUE=DATE:20260520
END:VEVENT
END:VCALENDAR`;

function ok(body: string, contentType: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": contentType },
  });
}

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("crawlEventFeeds", () => {
  it("liefert leeres Ergebnis wenn weder RSS noch iCal-URL gegeben ist", async () => {
    const result = await crawlEventFeeds({});
    expect(result.events).toEqual([]);
    expect(result.fetchedFromRss).toBe(0);
    expect(result.fetchedFromIcal).toBe(0);
  });

  it("crawlt nur RSS wenn iCal fehlt", async () => {
    const fetchMock = vi.fn(async () => ok(RSS_BODY, "application/rss+xml"));
    const result = await crawlEventFeeds({
      rssUrl: "https://example.test/feed.rss",
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.fetchedFromRss).toBe(2);
    expect(result.events).toHaveLength(2);
    expect(result.events[0].source).toBe("rss");
    expect(result.events[0].title).toBe("Wochenmarkt");
  });

  it("crawlt nur iCal wenn RSS fehlt", async () => {
    const fetchMock = vi.fn(async () => ok(ICAL_BODY, "text/calendar"));
    const result = await crawlEventFeeds({
      icalUrl: "https://example.test/events.ics",
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.fetchedFromIcal).toBe(1);
    expect(result.events[0].source).toBe("ical");
    expect(result.events[0].title).toBe("Stadtputzete");
    expect(result.events[0].location).toBe("Rathaus");
    expect(result.events[0].isAllDay).toBe(true);
  });

  it("kombiniert RSS und iCal in einer Liste", async () => {
    let i = 0;
    const fetchMock = vi.fn(async () => {
      const responses = [
        ok(RSS_BODY, "application/rss+xml"),
        ok(ICAL_BODY, "text/calendar"),
      ];
      return responses[i++];
    });
    const result = await crawlEventFeeds({
      rssUrl: "https://example.test/feed.rss",
      icalUrl: "https://example.test/events.ics",
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(result.events).toHaveLength(3); // 2 RSS + 1 iCal
    expect(result.fetchedFromRss).toBe(2);
    expect(result.fetchedFromIcal).toBe(1);
  });

  it("filtert Events ausserhalb fromDate/toDate-Range", async () => {
    const fetchMock = vi.fn(async () => ok(RSS_BODY, "application/rss+xml"));
    const result = await crawlEventFeeds({
      rssUrl: "https://example.test/feed.rss",
      fromDate: new Date("2026-06-01T00:00:00Z"),
      toDate: new Date("2026-06-30T23:59:59Z"),
      fetch: fetchMock as unknown as typeof fetch,
    });
    // Nur das Sommerfest (06-06) liegt in Range. Wochenmarkt (05-16) faellt raus.
    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe("Sommerfest");
  });

  it("dedupliziert Events anhand title + startDate", async () => {
    const dupRss = `<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <item><title>Wochenmarkt</title><link>https://x.test/a</link>
        <pubDate>Sat, 16 May 2026 08:00:00 +0200</pubDate><guid>a</guid></item>
      <item><title>Wochenmarkt</title><link>https://x.test/b</link>
        <pubDate>Sat, 16 May 2026 08:00:00 +0200</pubDate><guid>b</guid></item>
    </channel></rss>`;
    const fetchMock = vi.fn(async () => ok(dupRss, "application/rss+xml"));
    const result = await crawlEventFeeds({
      rssUrl: "https://example.test/feed.rss",
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(result.events).toHaveLength(1);
  });

  it("sammelt errors[] bei HTTP-Fehler statt zu werfen", async () => {
    const fetchMock = vi.fn(
      async () => new Response("nope", { status: 500 }),
    );
    const result = await crawlEventFeeds({
      rssUrl: "https://example.test/feed.rss",
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.events).toEqual([]);
  });

  it("sammelt errors[] bei Netzfehler statt zu werfen", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("Network down");
    });
    const result = await crawlEventFeeds({
      rssUrl: "https://example.test/feed.rss",
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.events).toEqual([]);
  });
});
