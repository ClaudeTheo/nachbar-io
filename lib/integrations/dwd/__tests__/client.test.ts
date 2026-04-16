import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDwdWarningsUrl, fetchDwdWarnings } from "../client";

describe("fetchDwdWarnings", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("builds the expected WFS url", () => {
    const url = buildDwdWarningsUrl("808337007");

    expect(url).toContain("typeName=dwd%3AWarnungen_Gemeinden");
    expect(url).toContain("cql_filter=WARNCELLID%3D808337007");
  });

  it("returns features from the WFS response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "FeatureCollection",
          features: [
            {
              id: "Warnungen_Gemeinden.1",
              type: "Feature",
              properties: {
                IDENTIFIER:
                  "2.49.0.0.276.0.DWD.PVW.1786075200000.bad-saeckingen-hitze.DEU",
                WARNCELLID: 808337007,
                SENT: "2026-08-06T10:00:00+02:00",
                MSGTYPE: "Alert",
                SEVERITY: "Severe",
                EVENT: "HITZE",
                EC_II: "31",
                HEADLINE: "Amtliche WARNUNG vor HITZE",
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchDwdWarnings("808337007");

    expect(result.warncellId).toBe("808337007");
    expect(result.warnings).toHaveLength(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("WARNCELLID%3D808337007");
  });

  it("retries on transient failures", async () => {
    vi.useFakeTimers();

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            type: "FeatureCollection",
            features: [],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = fetchDwdWarnings("808337007");
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.warnings).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
