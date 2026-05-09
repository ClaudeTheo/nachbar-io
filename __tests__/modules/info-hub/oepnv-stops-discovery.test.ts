// Welle H — Tests fuer Service oepnv-stops-discovery.

import { describe, expect, it, vi } from "vitest";

import { discoverOepnvStopsForQuarter } from "@/modules/info-hub/services/oepnv-stops-discovery.service";

type QuarterRow = {
  id: string;
  name: string;
  center_lat: number | null;
  center_lng: number | null;
};

function createSupabase(quarter: QuarterRow | null, error?: string) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: quarter,
            error: error ? { message: error } : null,
          })),
        })),
      })),
    })),
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("discoverOepnvStopsForQuarter", () => {
  it("liefert Top-N Stops mit Quartier-Metadaten bei Happy-Path", async () => {
    const supabase = createSupabase({
      id: "qid-1",
      name: "Bad Saeckingen",
      center_lat: 47.5535,
      center_lng: 7.9532,
    });
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        stopFinder: {
          points: [
            {
              name: "Bahnhof",
              ref: { id: "8506566", coords: "7.953,47.5535" },
              anyType: "stop",
              distance: "0",
            },
            {
              name: "Brennet",
              ref: { id: "8000123", coords: "7.951,47.555" },
              anyType: "stop",
              distance: "300",
            },
          ],
        },
      }),
    );

    const result = await discoverOepnvStopsForQuarter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "qid-1",
      { deps: { fetch: fetchMock as unknown as typeof fetch } },
    );

    expect(result.quarterId).toBe("qid-1");
    expect(result.quarterName).toBe("Bad Saeckingen");
    expect(result.centerLat).toBe(47.5535);
    expect(result.centerLng).toBe(7.9532);
    expect(result.stops).toHaveLength(2);
    expect(result.stops[0].id).toBe("8506566");
    expect(result.errors).toEqual([]);
    expect(typeof result.fetchedAt).toBe("string");
  });

  it("wirft mit klarer Message, wenn Quartier nicht existiert", async () => {
    const supabase = createSupabase(null);
    const fetchMock = vi.fn();

    await expect(
      discoverOepnvStopsForQuarter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase as any,
        "qid-missing",
        { deps: { fetch: fetchMock as unknown as typeof fetch } },
      ),
    ).rejects.toThrow(/Quartier.*qid-missing/i);
  });

  it("liefert leere stops + error, wenn Quartier keine Center-Koordinaten hat", async () => {
    const supabase = createSupabase({
      id: "qid-1",
      name: "Bad Saeckingen",
      center_lat: null,
      center_lng: null,
    });
    const fetchMock = vi.fn();

    const result = await discoverOepnvStopsForQuarter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "qid-1",
      { deps: { fetch: fetchMock as unknown as typeof fetch } },
    );

    expect(result.stops).toEqual([]);
    expect(result.errors[0]).toMatch(/center.*koordinat/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("liefert leere stops + error, wenn Stop-Finder failt", async () => {
    const supabase = createSupabase({
      id: "qid-1",
      name: "Bad Saeckingen",
      center_lat: 47.55,
      center_lng: 7.95,
    });
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("ENETUNREACH"));

    const result = await discoverOepnvStopsForQuarter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "qid-1",
      { deps: { fetch: fetchMock as unknown as typeof fetch } },
    );

    expect(result.stops).toEqual([]);
    expect(result.errors[0]).toMatch(/keine.*stops|leere.*antwort/i);
  });

  it("respektiert options.limit (Default 5)", async () => {
    const supabase = createSupabase({
      id: "qid-1",
      name: "Bad Saeckingen",
      center_lat: 47.55,
      center_lng: 7.95,
    });
    const points = Array.from({ length: 8 }, (_, i) => ({
      name: `Stop ${i}`,
      ref: { id: String(i), coords: "7.95,47.55" },
      anyType: "stop",
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ stopFinder: { points } }));

    const result = await discoverOepnvStopsForQuarter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "qid-1",
      { limit: 3, deps: { fetch: fetchMock as unknown as typeof fetch } },
    );

    expect(result.stops).toHaveLength(3);
  });
});
