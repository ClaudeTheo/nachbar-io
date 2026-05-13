import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMapActivityPins } from "@/lib/hooks/useMapActivityPins";

describe("useMapActivityPins", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("laedt den sicheren Activity-Feed mit Modus-Query", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: "pin-1",
            type: "mowing",
            lat: 47.562,
            lng: 7.945,
            title: "Rasenhilfe",
            locationPrecision: "approx_50m",
            urgency: "urgent",
            colorState: "yellow",
            locationScope: "home",
            visibility: "public",
            source: "help_requests",
          },
        ]),
        { status: 200 },
      ),
    );

    const { result } = renderHook(() =>
      useMapActivityPins({ mode: "comfort" }),
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.pins).toHaveLength(1);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/map/activities?mode=comfort",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(result.current.pins[0]).toMatchObject({
      id: "pin-1",
      type: "mowing",
      colorState: "yellow",
      locationScope: "home",
    });
    expect(result.current.error).toBeNull();
  });

  it("bleibt bei API-Fehlern leer, damit die Karte weiter nutzbar ist", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 500 }));

    const { result } = renderHook(() => useMapActivityPins());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pins).toEqual([]);
    expect(result.current.error).toBe("activity_fetch_failed");
  });

  it("laedt nichts, wenn der Hook deaktiviert ist", () => {
    const { result } = renderHook(() => useMapActivityPins({ enabled: false }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      pins: [],
      loading: false,
      error: null,
    });
  });
});
