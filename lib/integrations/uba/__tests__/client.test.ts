import { afterEach, describe, expect, it, vi } from "vitest";
import stationsFixture from "./fixtures/uba-stations.json";
import airqualityFixture from "./fixtures/uba-airquality.json";
import {
  buildUbaAirQualityUrl,
  fetchUbaAirQuality,
  fetchUbaStations,
  selectNearestBwStations,
} from "../client";

describe("fetchUbaStations", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("normalizes UBA stations and filters nearest BW stations", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(stationsFixture), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const stations = await fetchUbaStations();
    const nearest = selectNearestBwStations(stations, {
      lat: 47.5535,
      lng: 7.9640,
    });

    expect(stations).toHaveLength(3);
    expect(nearest.map((station) => station.code)).toEqual([
      "DEBW023",
      "DEBW031",
    ]);
  });

  it("builds the expected air quality url", () => {
    const url = buildUbaAirQualityUrl("DEBW031", {
      dateFrom: new Date("2026-04-15T00:00:00Z"),
      dateTo: new Date("2026-04-16T00:00:00Z"),
    });

    expect(url).toContain("station=DEBW031");
    expect(url).toContain("date_from=2026-04-15");
    expect(url).toContain("date_to=2026-04-16");
  });

  it("returns air quality payloads from the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(airqualityFixture), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchUbaAirQuality("DEBW031", {
      dateFrom: new Date("2026-04-15T00:00:00Z"),
      dateTo: new Date("2026-04-16T00:00:00Z"),
    });

    expect(result.count).toBe(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("station=DEBW031");
  });

  it("retries on transient failures", async () => {
    vi.useFakeTimers();

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(stationsFixture), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = fetchUbaStations();
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
