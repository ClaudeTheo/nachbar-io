// __tests__/lib/feeds/rss-parser.test.ts
// Welle W10 — Generischer RSS-Parser fuer Event-Feeds.
// Nicht zu verwechseln mit news-rss.service.ts (parseRSSItems privat dort,
// News-spezifisch). Dieser Parser ist generisch + exportiert.

import { describe, expect, it } from "vitest";

import { parseRssFeed } from "@/lib/feeds/rss-parser";

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Stadt Bad Saeckingen Events</title>
    <link>https://example.test</link>
    <description>Veranstaltungen</description>
    <item>
      <title>Wochenmarkt</title>
      <link>https://example.test/event/wochenmarkt</link>
      <description>Frische Produkte am Muensterplatz</description>
      <pubDate>Sat, 16 May 2026 08:00:00 +0200</pubDate>
      <guid>evt-001</guid>
    </item>
    <item>
      <title><![CDATA[Sommerfest am Rhein]]></title>
      <link><![CDATA[https://example.test/event/sommerfest]]></link>
      <description><![CDATA[<p>Konzert + Feuerwerk</p>]]></description>
      <pubDate>Sat, 06 Jun 2026 19:00:00 +0200</pubDate>
      <guid isPermaLink="false">evt-002</guid>
    </item>
  </channel>
</rss>`;

describe("parseRssFeed", () => {
  it("parst Standard-RSS-2.0-Feed mit zwei Items", () => {
    const items = parseRssFeed(SAMPLE_RSS);
    expect(items).toHaveLength(2);
  });

  it("extrahiert Title, Link, Description, PubDate, Guid", () => {
    const items = parseRssFeed(SAMPLE_RSS);
    expect(items[0]).toEqual({
      title: "Wochenmarkt",
      link: "https://example.test/event/wochenmarkt",
      description: "Frische Produkte am Muensterplatz",
      pubDate: "2026-05-16T06:00:00.000Z", // 08:00 +0200 = 06:00 UTC
      guid: "evt-001",
    });
  });

  it("handhabt CDATA-Sections im Title und Description", () => {
    const items = parseRssFeed(SAMPLE_RSS);
    expect(items[1].title).toBe("Sommerfest am Rhein");
    // HTML-Tags werden entfernt
    expect(items[1].description).toBe("Konzert + Feuerwerk");
  });

  it("liefert null fuer fehlendes pubDate", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><item>
      <title>Test</title><link>https://x.test</link>
    </item></channel></rss>`;
    const items = parseRssFeed(xml);
    expect(items).toHaveLength(1);
    expect(items[0].pubDate).toBeNull();
    expect(items[0].guid).toBeNull();
  });

  it("liefert leeres Array fuer malformed XML", () => {
    expect(parseRssFeed("not xml at all")).toEqual([]);
    expect(parseRssFeed("")).toEqual([]);
  });

  it("ignoriert Items ohne Title oder Link", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>Nur-Titel</title></item>
      <item><link>https://x.test</link></item>
      <item><title>Ok</title><link>https://ok.test</link></item>
    </channel></rss>`;
    const items = parseRssFeed(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Ok");
  });

  it("decodiert HTML-Entities in Titel", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><item>
      <title>Schl&amp;uuml;sselfest &amp;amp; M&amp;auml;rktle</title>
      <link>https://x.test</link>
    </item></channel></rss>`;
    const items = parseRssFeed(xml);
    expect(items[0].title).toContain("&");
  });

  it("parst Atom-Feed (alternativer Standard)", () => {
    const atom = `<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>Atom-Event</title>
        <link href="https://example.test/atom-event"/>
        <summary>Beschreibung</summary>
        <published>2026-06-15T10:00:00Z</published>
        <id>atom-1</id>
      </entry>
    </feed>`;
    const items = parseRssFeed(atom);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Atom-Event");
    expect(items[0].link).toBe("https://example.test/atom-event");
    expect(items[0].pubDate).toBe("2026-06-15T10:00:00.000Z");
    expect(items[0].guid).toBe("atom-1");
  });
});
