// __tests__/api/admin/quarters/onboard.test.ts
// Welle W4 (Mini) — POST /api/admin/quarters/[id]/onboard
// Orchestriert Welle J (Feed-Probe) + Welle H (OEPNV-Discover) + Welle W10 (Crawler).

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

// Admin-DB Mock — fuer das Quartier.city-Lookup im Auto-Domain-Discovery-Pfad
const adminFromMock = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: adminFromMock }),
}));

const resolveCityDomainMock = vi.fn();
vi.mock("@/lib/cities/domain-resolver", () => ({
  resolveCityDomain: (...args: unknown[]) => resolveCityDomainMock(...args),
}));

const probeMock = vi.fn();
vi.mock("@/lib/events/feed-url-prober", () => ({
  probeFeedUrls: (...args: unknown[]) => probeMock(...args),
}));

const discoverStopsMock = vi.fn();
vi.mock("@/modules/info-hub/services/oepnv-stops-discovery.service", () => ({
  discoverOepnvStopsForQuarter: (...args: unknown[]) =>
    discoverStopsMock(...args),
}));

const crawlMock = vi.fn();
vi.mock("@/modules/events/services/event-feed-crawler.service", () => ({
  crawlEventFeeds: (...args: unknown[]) => crawlMock(...args),
}));

const discoverDoctorsMock = vi.fn();
vi.mock("@/modules/doctors/services/doctor-discovery.service", () => ({
  discoverDoctorsForQuarter: (...args: unknown[]) => discoverDoctorsMock(...args),
}));

beforeEach(() => {
  getUserMock.mockReset();
  fromMock.mockReset();
  adminFromMock.mockReset();
  resolveCityDomainMock.mockReset();
  probeMock.mockReset();
  discoverStopsMock.mockReset();
  crawlMock.mockReset();
  discoverDoctorsMock.mockReset();

  // Default: super_admin
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

  // Default: Admin-DB-Mock liefert Quartier-Daten je nach Select-Feld.
  // Welle Doctor-Discovery liest center_lat/center_lng zusaetzlich zum city-Lookup.
  adminFromMock.mockImplementation(() => ({
    select: (cols: string) => ({
      eq: () => ({
        single: async () => {
          if (cols.includes("center_lat")) {
            return {
              data: { center_lat: 47.5535, center_lng: 7.964 },
              error: null,
            };
          }
          return { data: { city: "Bad Säckingen" }, error: null };
        },
      }),
    }),
  }));

  // Default: Doctor-Discovery laeuft sauber durch ohne neue Eintraege.
  discoverDoctorsMock.mockResolvedValue({
    quarterId: "q-1",
    inserted: 0,
    updated: 0,
    hidden: 0,
    total: 0,
    errors: [],
  });

  // Default: resolveCityDomain liefert nichts (Tests ohne Auto-Discovery)
  resolveCityDomainMock.mockResolvedValue({
    domain: null,
    candidatesTried: [],
    errors: [],
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
    "@/app/api/admin/quarters/[id]/onboard/route"
  );
  const req = new Request(
    "http://localhost/api/admin/quarters/q-1/onboard",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    },
  );
  return POST(req, { params: Promise.resolve({ id: paramId }) });
}

describe("POST /api/admin/quarters/[id]/onboard", () => {
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

  it("Happy-Path: ruft Probe + Discover + Crawl wenn domain gegeben", async () => {
    probeMock.mockResolvedValueOnce({
      rss: "https://x.test/feed.rss",
      ical: "https://x.test/events.ics",
      errors: [],
    });
    discoverStopsMock.mockResolvedValueOnce({
      quarterId: "q-1",
      quarterName: "Test",
      centerLat: 47.5,
      centerLng: 7.96,
      stops: [{ id: "s1", name: "Bahnhof", lat: 47.5, lng: 7.96, type: "stop", distanceMeters: 100 }],
      fetchedAt: "2026-05-10T10:00:00Z",
      errors: [],
    });
    crawlMock.mockResolvedValueOnce({
      events: [
        {
          source: "ical",
          feedUrl: "https://x.test/events.ics",
          uid: "1",
          title: "Wochenmarkt",
          description: null,
          location: null,
          startDate: "2026-06-01",
          endDate: null,
          link: null,
          isAllDay: true,
        },
      ],
      errors: [],
      fetchedFromRss: 0,
      fetchedFromIcal: 1,
    });

    const res = await callPost({ domain: "https://stadt.test" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.feeds).toEqual({
      rss: "https://x.test/feed.rss",
      ical: "https://x.test/events.ics",
    });
    expect(json.stops).toHaveLength(1);
    expect(json.events).toHaveLength(1);
    expect(json.errors).toEqual([]);

    expect(probeMock).toHaveBeenCalledTimes(1);
    expect(discoverStopsMock).toHaveBeenCalledTimes(1);
    expect(crawlMock).toHaveBeenCalledTimes(1);
  });

  it("ueberspringt Crawl wenn weder RSS noch iCal gefunden", async () => {
    probeMock.mockResolvedValueOnce({ rss: null, ical: null, errors: ["404"] });
    discoverStopsMock.mockResolvedValueOnce({
      quarterId: "q-1",
      quarterName: "Test",
      centerLat: 47.5,
      centerLng: 7.96,
      stops: [],
      fetchedAt: "2026-05-10T10:00:00Z",
      errors: [],
    });

    const res = await callPost({ domain: "https://stadt.test" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.feeds.rss).toBeNull();
    expect(json.events).toEqual([]);
    expect(crawlMock).not.toHaveBeenCalled();
  });

  it("ohne body.domain: City-Lookup + resolveCityDomain wird gerufen", async () => {
    // Auto-Discovery findet KEINE Domain (Default-Mock) -> kein Probe
    discoverStopsMock.mockResolvedValueOnce({
      quarterId: "q-1",
      quarterName: "Test",
      centerLat: 47.5,
      centerLng: 7.96,
      stops: [],
      fetchedAt: "2026-05-10T10:00:00Z",
      errors: [],
    });

    const res = await callPost({});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(resolveCityDomainMock).toHaveBeenCalledWith("Bad Säckingen");
    expect(json.domainAutoDiscovered).toBe(false); // Default-Mock liefert null
    expect(json.feeds).toEqual({ rss: null, ical: null });
    expect(json.events).toEqual([]);

    expect(probeMock).not.toHaveBeenCalled();
    expect(crawlMock).not.toHaveBeenCalled();
    expect(discoverStopsMock).toHaveBeenCalledTimes(1);
  });

  it("Auto-Discovery findet Domain -> Probe wird mit dieser Domain gerufen", async () => {
    resolveCityDomainMock.mockResolvedValueOnce({
      domain: "https://www.badsaeckingen.de",
      candidatesTried: ["https://www.badsaeckingen.de"],
      errors: [],
    });
    probeMock.mockResolvedValueOnce({
      rss: "https://www.badsaeckingen.de/events.rss",
      ical: null,
      errors: [],
    });
    discoverStopsMock.mockResolvedValueOnce({
      quarterId: "q-1",
      quarterName: "Test",
      centerLat: 47.5,
      centerLng: 7.96,
      stops: [],
      fetchedAt: "2026-05-10T10:00:00Z",
      errors: [],
    });
    crawlMock.mockResolvedValueOnce({
      events: [],
      errors: [],
      fetchedFromRss: 0,
      fetchedFromIcal: 0,
    });

    const res = await callPost({});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.domain).toBe("https://www.badsaeckingen.de");
    expect(json.domainAutoDiscovered).toBe(true);
    expect(probeMock).toHaveBeenCalledWith("https://www.badsaeckingen.de");
  });

  it("body.domain ueberschreibt Auto-Discovery (Test-Override)", async () => {
    probeMock.mockResolvedValueOnce({ rss: null, ical: null, errors: [] });
    discoverStopsMock.mockResolvedValueOnce({
      quarterId: "q-1",
      quarterName: "Test",
      centerLat: 47.5,
      centerLng: 7.96,
      stops: [],
      fetchedAt: "2026-05-10T10:00:00Z",
      errors: [],
    });

    const res = await callPost({ domain: "https://override.test" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.domain).toBe("https://override.test");
    expect(json.domainAutoDiscovered).toBe(false);
    expect(resolveCityDomainMock).not.toHaveBeenCalled();
  });

  it("sammelt Errors aus jedem Schritt ohne zu werfen", async () => {
    probeMock.mockResolvedValueOnce({
      rss: null,
      ical: null,
      errors: ["timeout"],
    });
    discoverStopsMock.mockRejectedValueOnce(new Error("DB-Fehler"));

    const res = await callPost({ domain: "https://stadt.test" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.errors.length).toBeGreaterThan(0);
    expect(json.stops).toEqual([]);
  });
});
