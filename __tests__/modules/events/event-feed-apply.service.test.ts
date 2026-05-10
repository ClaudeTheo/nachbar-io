// __tests__/modules/events/event-feed-apply.service.test.ts
// Welle W10-Persist — applyCrawledEventsForQuarter(supabase, quarterId, events)
// schreibt validierte CrawledEvent[] in municipal_config.crawled_events.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  applyCrawledEventsForQuarter,
  type CrawledEventInput,
} from "@/modules/events/services/event-feed-apply.service";

function makeSupabase(updateError: unknown = null) {
  const eqMock = vi.fn(async () => ({ error: updateError }));
  const updateMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn(() => ({ update: updateMock }));
  return {
    client: { from: fromMock } as unknown as SupabaseClient,
    fromMock,
    updateMock,
    eqMock,
  };
}

const SAMPLE_EVENTS: CrawledEventInput[] = [
  {
    source: "ical",
    feedUrl: "https://x.test/events.ics",
    uid: "1",
    title: "Wochenmarkt",
    description: null,
    location: "Muensterplatz",
    startDate: "2026-06-01",
    endDate: null,
    link: null,
    isAllDay: true,
  },
  {
    source: "rss",
    feedUrl: "https://x.test/feed.rss",
    uid: "2",
    title: "Sommerfest",
    description: "Konzert + Feuerwerk",
    location: null,
    startDate: "2026-06-06T18:00:00.000Z",
    endDate: null,
    link: "https://x.test/sommerfest",
    isAllDay: false,
  },
];

beforeEach(() => {
  // empty
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("applyCrawledEventsForQuarter", () => {
  it("schreibt events + synced_at in municipal_config", async () => {
    const { client, fromMock, updateMock, eqMock } = makeSupabase();
    const result = await applyCrawledEventsForQuarter(
      client,
      "q-1",
      SAMPLE_EVENTS,
    );

    expect(fromMock).toHaveBeenCalledWith("municipal_config");
    expect(eqMock).toHaveBeenCalledWith("quarter_id", "q-1");

    const calls = updateMock.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const payload = calls[0][0];
    expect(payload.crawled_events).toEqual(SAMPLE_EVENTS);
    expect(typeof payload.crawled_events_synced_at).toBe("string");
    // ISO-Format
    expect(payload.crawled_events_synced_at).toMatch(/T.*Z/);

    expect(result.savedCount).toBe(2);
  });

  it("wirft bei nicht-Array Input", async () => {
    const { client } = makeSupabase();
    await expect(
      // @ts-expect-error absichtlicher Falsch-Input
      applyCrawledEventsForQuarter(client, "q-1", "not-array"),
    ).rejects.toThrow(/Array/);
  });

  it("ueberspringt Events ohne title oder startDate", async () => {
    const { client, updateMock } = makeSupabase();
    const mixed: CrawledEventInput[] = [
      ...SAMPLE_EVENTS,
      // ungueltig: ohne title
      {
        source: "rss",
        feedUrl: "https://x.test/feed.rss",
        uid: "bad",
        title: "",
        description: null,
        location: null,
        startDate: "2026-06-10",
        endDate: null,
        link: null,
        isAllDay: false,
      },
    ];
    const result = await applyCrawledEventsForQuarter(client, "q-1", mixed);

    expect(result.savedCount).toBe(2);
    const calls = updateMock.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const payload = calls[0][0];
    expect((payload.crawled_events as unknown[]).length).toBe(2);
  });

  it("limitiert auf MAX_EVENTS (100)", async () => {
    const { client } = makeSupabase();
    const many: CrawledEventInput[] = Array.from({ length: 150 }, (_, i) => ({
      source: "ical" as const,
      feedUrl: "https://x.test/events.ics",
      uid: `${i}`,
      title: `Event ${i}`,
      description: null,
      location: null,
      startDate: "2026-06-01",
      endDate: null,
      link: null,
      isAllDay: true,
    }));
    await expect(
      applyCrawledEventsForQuarter(client, "q-1", many),
    ).rejects.toThrow(/100/);
  });

  it("propagiert DB-Fehler aus update", async () => {
    const { client } = makeSupabase({ message: "RLS denied" });
    await expect(
      applyCrawledEventsForQuarter(client, "q-1", SAMPLE_EVENTS),
    ).rejects.toThrow(/RLS denied/);
  });
});
