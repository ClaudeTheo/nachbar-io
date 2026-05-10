// __tests__/api/admin/quarters/events-crawl.test.ts
// Welle W10 — Admin-Endpoint POST /api/admin/quarters/[id]/events/crawl

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Module-Mocks ---

const getUserMock = vi.fn();
const fromMock = vi.fn();
const supabaseMock = {
  auth: { getUser: getUserMock },
  from: fromMock,
};
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => supabaseMock,
}));

const crawlMock = vi.fn();
vi.mock("@/modules/events/services/event-feed-crawler.service", () => ({
  crawlEventFeeds: (...args: unknown[]) => crawlMock(...args),
}));

beforeEach(() => {
  getUserMock.mockReset();
  fromMock.mockReset();
  crawlMock.mockReset();

  // Default super_admin
  getUserMock.mockResolvedValue({
    data: { user: { id: "u-admin" } },
    error: null,
  });
  fromMock.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: { role: "super_admin" }, error: null }),
      }),
    }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function callPost(
  body: unknown,
  paramId: string = "q-1",
): Promise<Response> {
  const { POST } = await import(
    "@/app/api/admin/quarters/[id]/events/crawl/route"
  );
  const req = new Request(
    "http://localhost/api/admin/quarters/q-1/events/crawl",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    },
  );
  return POST(req, { params: Promise.resolve({ id: paramId }) });
}

describe("POST /api/admin/quarters/[id]/events/crawl", () => {
  it("returns 401 wenn nicht angemeldet", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const res = await callPost({});
    expect(res.status).toBe(401);
  });

  it("returns 403 wenn nicht super_admin", async () => {
    fromMock.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { role: "resident" }, error: null }),
        }),
      }),
    });
    const res = await callPost({});
    expect(res.status).toBe(403);
  });

  it("returns 400 bei nicht-JSON Body", async () => {
    const { POST } = await import(
      "@/app/api/admin/quarters/[id]/events/crawl/route"
    );
    const req = new Request(
      "http://localhost/api/admin/quarters/q-1/events/crawl",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      },
    );
    const res = await POST(req, { params: Promise.resolve({ id: "q-1" }) });
    expect(res.status).toBe(400);
  });

  it("ruft Crawler mit rssUrl + icalUrl aus Body und returns events", async () => {
    crawlMock.mockResolvedValueOnce({
      events: [
        {
          source: "rss",
          feedUrl: "https://x.test/feed.rss",
          uid: "1",
          title: "Test",
          description: null,
          location: null,
          startDate: "2026-06-01",
          endDate: null,
          link: null,
          isAllDay: false,
        },
      ],
      errors: [],
      fetchedFromRss: 1,
      fetchedFromIcal: 0,
    });

    const res = await callPost({
      rssUrl: "https://x.test/feed.rss",
      icalUrl: "https://x.test/events.ics",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.events).toHaveLength(1);
    expect(json.fetchedFromRss).toBe(1);
    expect(crawlMock).toHaveBeenCalledTimes(1);
    const opts = crawlMock.mock.calls[0][0];
    expect(opts.rssUrl).toBe("https://x.test/feed.rss");
    expect(opts.icalUrl).toBe("https://x.test/events.ics");
  });

  it("interpretiert fromDate/toDate als ISO-Strings und uebergibt Date-Objekte", async () => {
    crawlMock.mockResolvedValueOnce({
      events: [],
      errors: [],
      fetchedFromRss: 0,
      fetchedFromIcal: 0,
    });

    await callPost({
      rssUrl: "https://x.test/feed.rss",
      fromDate: "2026-06-01T00:00:00Z",
      toDate: "2026-06-30T23:59:59Z",
    });

    const opts = crawlMock.mock.calls[0][0];
    expect(opts.fromDate).toBeInstanceOf(Date);
    expect(opts.toDate).toBeInstanceOf(Date);
    expect(opts.fromDate.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("returns 400 wenn weder rssUrl noch icalUrl gegeben", async () => {
    const res = await callPost({});
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(String(json.error)).toMatch(/rssUrl|icalUrl/i);
  });
});
