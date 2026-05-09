// Welle J — Tests fuer den Feed-URL-Prober. Sucht Standard-Pfade
// (z.B. /veranstaltungen.rss, /events.ics) auf einer Stadt-Domain.

import { describe, expect, it, vi } from "vitest";

import { probeFeedUrls } from "@/lib/events/feed-url-prober";

function jsonResponse(
  status: number,
  contentType: string,
  body = "",
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? contentType : null,
    },
    text: async () => body,
    json: async () => ({}),
  } as unknown as Response;
}

describe("probeFeedUrls", () => {
  it("findet eine RSS-URL, wenn der Standard-Pfad einen Feed liefert", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith("/veranstaltungen.rss")) {
        return jsonResponse(200, "application/rss+xml");
      }
      return jsonResponse(404, "text/html");
    });

    const result = await probeFeedUrls("https://www.bad-saeckingen.de", {
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result.rss).toBe(
      "https://www.bad-saeckingen.de/veranstaltungen.rss",
    );
    expect(result.ical).toBeNull();
    expect(result.errors).toEqual([]);
  });

  it("findet eine iCal-URL, wenn der Standard-Pfad einen Kalender liefert", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith("/events.ics")) {
        return jsonResponse(200, "text/calendar");
      }
      return jsonResponse(404, "text/html");
    });

    const result = await probeFeedUrls("https://example.de", {
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result.ical).toBe("https://example.de/events.ics");
    expect(result.rss).toBeNull();
  });

  it("findet beide Feeds, wenn beide vorhanden sind", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith("/veranstaltungen.rss")) {
        return jsonResponse(200, "application/xml");
      }
      if (u.endsWith("/events.ics")) {
        return jsonResponse(200, "text/calendar; charset=utf-8");
      }
      return jsonResponse(404, "text/html");
    });

    const result = await probeFeedUrls("example.de", {
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result.rss).toContain("/veranstaltungen.rss");
    expect(result.ical).toContain("/events.ics");
  });

  it("ergaenzt fehlendes https:// und entfernt trailing slash", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(404, "text/html"));

    await probeFeedUrls("example.de/", {
      fetch: fetchMock as unknown as typeof fetch,
    });

    const calledUrls = fetchMock.mock.calls.map((c) => String(c[0]));
    for (const url of calledUrls) {
      expect(url).toMatch(/^https:\/\/example\.de\//);
      expect(url).not.toMatch(/example\.de\/\//);
    }
  });

  it("liefert beide null, wenn alle Pfade 404 liefern", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(404, "text/html"));

    const result = await probeFeedUrls("https://example.de", {
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result.rss).toBeNull();
    expect(result.ical).toBeNull();
  });

  it("akzeptiert RSS NICHT, wenn content-type HTML statt XML ist", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith("/veranstaltungen.rss")) {
        return jsonResponse(200, "text/html");
      }
      return jsonResponse(404, "text/html");
    });

    const result = await probeFeedUrls("https://example.de", {
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result.rss).toBeNull();
  });

  it("akzeptiert iCal NICHT, wenn content-type HTML statt calendar ist", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith("/events.ics")) {
        return jsonResponse(200, "text/html");
      }
      return jsonResponse(404, "text/html");
    });

    const result = await probeFeedUrls("https://example.de", {
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result.ical).toBeNull();
  });

  it("waehlt den ersten Treffer aus mehreren RSS-Kandidaten", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      // /veranstaltungen.rss kommt vor /termine.rss in der Default-Liste
      if (u.endsWith("/veranstaltungen.rss") || u.endsWith("/termine.rss")) {
        return jsonResponse(200, "application/rss+xml");
      }
      return jsonResponse(404, "text/html");
    });

    const result = await probeFeedUrls("https://example.de", {
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result.rss).toBe("https://example.de/veranstaltungen.rss");
  });

  it("liefert errors, wenn fetch wirft", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("ENETUNREACH"));

    const result = await probeFeedUrls("https://example.de", {
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result.rss).toBeNull();
    expect(result.ical).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/ENETUNREACH/);
  });

  it("akzeptiert benutzerdefinierte Pfad-Listen", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith("/feed-custom.rss")) {
        return jsonResponse(200, "application/rss+xml");
      }
      return jsonResponse(404, "text/html");
    });

    const result = await probeFeedUrls(
      "https://example.de",
      {
        fetch: fetchMock as unknown as typeof fetch,
      },
      {
        rssPaths: ["/feed-custom.rss"],
        icalPaths: [],
      },
    );

    expect(result.rss).toBe("https://example.de/feed-custom.rss");
  });
});
