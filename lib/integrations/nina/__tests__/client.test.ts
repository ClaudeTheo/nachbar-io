import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "./fixtures/nina-bad-saeckingen.json";
import {
  fetchNinaWarnings,
  normalizeNinaDashboardArs,
} from "../client";

describe("fetchNinaWarnings", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("normalizes a municipal AGS to the BBK dashboard ARS", () => {
    expect(normalizeNinaDashboardArs("08337007")).toBe("083370000000");
    expect(normalizeNinaDashboardArs("083370000000")).toBe("083370000000");
  });

  it("parses a dashboard response and keeps the original ars in the result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(fixture), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNinaWarnings("08337007");

    expect(result.ars).toBe("08337007");
    expect(result.warnings).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("083370000000.json");
  });

  it("retries on transient failures", async () => {
    vi.useFakeTimers();

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = fetchNinaWarnings("08337007");
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.warnings).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn().mockRejectedValue(new Error("5xx"));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = expect(fetchNinaWarnings("08337007")).rejects.toThrow(
      "5xx",
    );
    await vi.runAllTimersAsync();

    await resultPromise;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
