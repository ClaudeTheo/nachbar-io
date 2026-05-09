// Welle H — RED-Tests fuer EFA-BW Stop-Finder.
// Pure-Parser + injektierbarer fetch fuer Tests ohne Netz.

import { describe, expect, it, vi } from "vitest";

import {
  findEfaBwStopsNearCoordinate,
  parseStopFinderResponse,
} from "@/lib/oepnv/efa-bw-stop-finder";

describe("parseStopFinderResponse", () => {
  it("liefert [] bei null/undefined/leerem Object", () => {
    expect(parseStopFinderResponse(null)).toEqual([]);
    expect(parseStopFinderResponse(undefined)).toEqual([]);
    expect(parseStopFinderResponse({})).toEqual([]);
    expect(parseStopFinderResponse({ stopFinder: {} })).toEqual([]);
  });

  it("liest Stops aus der EFA-Variante 'points: Array'", () => {
    const json = {
      stopFinder: {
        points: [
          {
            name: "Bad Säckingen Bahnhof",
            ref: { id: "8506566", coords: "7.953200,47.553500" },
            anyType: "stop",
          },
          {
            name: "Bad Säckingen Brennetweg",
            ref: { id: "8000123", coords: "7.951000,47.555000" },
            anyType: "stop",
          },
        ],
      },
    };

    const stops = parseStopFinderResponse(json);
    expect(stops).toHaveLength(2);
    expect(stops[0]).toMatchObject({
      id: "8506566",
      name: "Bad Säckingen Bahnhof",
      lat: 47.5535,
      lng: 7.9532,
      type: "stop",
    });
    expect(stops[1].id).toBe("8000123");
  });

  it("liest Stops aus der EFA-Variante 'points.point: Array'", () => {
    const json = {
      stopFinder: {
        points: {
          point: [
            {
              name: "Stop A",
              ref: { id: "1", coords: "7.95,47.55" },
              anyType: "stop",
            },
            {
              name: "Stop B",
              ref: { id: "2", coords: "7.96,47.56" },
              anyType: "stop",
            },
          ],
        },
      },
    };

    const stops = parseStopFinderResponse(json);
    expect(stops.map((s) => s.id)).toEqual(["1", "2"]);
  });

  it("liest Stop aus der EFA-Variante 'points.point: SingleObject'", () => {
    const json = {
      stopFinder: {
        points: {
          point: {
            name: "Solo Stop",
            ref: { id: "9", coords: "7.95,47.55" },
            anyType: "stop",
          },
        },
      },
    };

    const stops = parseStopFinderResponse(json);
    expect(stops).toHaveLength(1);
    expect(stops[0].id).toBe("9");
  });

  it("filtert Eintraege ohne id oder coords aus", () => {
    const json = {
      stopFinder: {
        points: [
          { name: "OK", ref: { id: "1", coords: "7.95,47.55" } },
          { name: "Kein ID", ref: { coords: "7.95,47.55" } },
          { name: "Keine Coords", ref: { id: "x" } },
          { name: "Coords kaputt", ref: { id: "y", coords: "abc" } },
          {},
        ],
      },
    };

    const stops = parseStopFinderResponse(json);
    expect(stops).toHaveLength(1);
    expect(stops[0].id).toBe("1");
  });

  it("uebernimmt Distanz aus distance-Feld, sonst null", () => {
    const json = {
      stopFinder: {
        points: [
          {
            name: "Mit Distanz",
            ref: { id: "1", coords: "7.95,47.55" },
            distance: "120",
          },
          {
            name: "Ohne",
            ref: { id: "2", coords: "7.96,47.56" },
          },
        ],
      },
    };

    const stops = parseStopFinderResponse(json);
    expect(stops[0].distanceMeters).toBe(120);
    expect(stops[1].distanceMeters).toBeNull();
  });

  it("klassifiziert anyType: stop=stop, platform=platform, sonst unknown", () => {
    const json = {
      stopFinder: {
        points: [
          { name: "S", ref: { id: "1", coords: "1,1" }, anyType: "stop" },
          { name: "P", ref: { id: "2", coords: "1,1" }, anyType: "platform" },
          { name: "A", ref: { id: "3", coords: "1,1" }, anyType: "address" },
          { name: "U", ref: { id: "4", coords: "1,1" } },
        ],
      },
    };

    const stops = parseStopFinderResponse(json);
    expect(stops[0].type).toBe("stop");
    expect(stops[1].type).toBe("platform");
    expect(stops[2].type).toBe("address");
    expect(stops[3].type).toBe("unknown");
  });
});

describe("findEfaBwStopsNearCoordinate", () => {
  function jsonResponse(body: unknown, status = 200): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () =>
        typeof body === "string" ? body : JSON.stringify(body),
    } as unknown as Response;
  }

  it("ruft EFA-BW Stop-Finder mit korrekter URL und Koordinate auf", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          stopFinder: {
            points: [
              {
                name: "Foo",
                ref: { id: "1", coords: "7.95,47.55" },
                anyType: "stop",
              },
            ],
          },
        }),
      );

    const stops = await findEfaBwStopsNearCoordinate(
      { lat: 47.5535, lng: 7.9532, limit: 5 },
      { fetch: fetchMock as unknown as typeof fetch },
    );

    expect(stops).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("efa-bw.de");
    expect(url).toContain("XSLT_STOPFINDER_REQUEST");
    expect(url).toContain("outputFormat=JSON");
    expect(url).toMatch(/name_sf=47\.5535[%:]?A?7?\.?9?5?3?2?/i);
    expect(url).toContain("coordOutputFormat");
  });

  it("limitiert das Ergebnis auf options.limit (Default 5)", async () => {
    const points = Array.from({ length: 10 }, (_, i) => ({
      name: `Stop ${i}`,
      ref: { id: String(i), coords: `7.9${i},47.55` },
      anyType: "stop",
      distance: String(i * 10),
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ stopFinder: { points } }));

    const stops = await findEfaBwStopsNearCoordinate(
      { lat: 47.55, lng: 7.95 },
      { fetch: fetchMock as unknown as typeof fetch },
    );

    expect(stops).toHaveLength(5);
    expect(stops.map((s) => s.id)).toEqual(["0", "1", "2", "3", "4"]);
  });

  it("respektiert limit=10", async () => {
    const points = Array.from({ length: 10 }, (_, i) => ({
      name: `Stop ${i}`,
      ref: { id: String(i), coords: `7.9${i},47.55` },
      anyType: "stop",
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ stopFinder: { points } }));

    const stops = await findEfaBwStopsNearCoordinate(
      { lat: 47.55, lng: 7.95, limit: 10 },
      { fetch: fetchMock as unknown as typeof fetch },
    );

    expect(stops).toHaveLength(10);
  });

  it("liefert [] bei HTTP-Fehler statt zu werfen", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse("Server Error", 500));

    const stops = await findEfaBwStopsNearCoordinate(
      { lat: 47.55, lng: 7.95 },
      { fetch: fetchMock as unknown as typeof fetch },
    );

    expect(stops).toEqual([]);
  });

  it("liefert [] bei fetch-Exception (Netzwerkfehler)", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("ENETUNREACH"));

    const stops = await findEfaBwStopsNearCoordinate(
      { lat: 47.55, lng: 7.95 },
      { fetch: fetchMock as unknown as typeof fetch },
    );

    expect(stops).toEqual([]);
  });

  it("nutzt Default-baseUrl, wenn nicht uebergeben", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ stopFinder: { points: [] } }),
      );

    await findEfaBwStopsNearCoordinate(
      { lat: 47.55, lng: 7.95 },
      { fetch: fetchMock as unknown as typeof fetch },
    );

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toMatch(/^https:\/\/www\.efa-bw\.de\/nvbw\/XSLT_STOPFINDER_REQUEST/);
  });
});
