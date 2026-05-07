import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTerminalData } from "@/lib/terminal/useTerminalData";

describe("useTerminalData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalisiert kaputte Listen aus der Device-Status-API", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        weather: {
          temp: 18,
          icon: "sun",
          forecast: { day: "Mo", tempMax: 20 },
        },
        alerts: { id: "alert-1", title: "Kaputte Nachricht" },
        news: "kaputte Neuigkeiten",
        newsCount: 3,
        lastCheckin: null,
        nextAppointment: null,
        unreadCount: 2,
        userName: "Frau Mueller",
        greeting: "Guten Tag",
        photosCount: 1,
        remindersCount: 1,
        stickiesCount: 1,
        appointmentsToday: 1,
      }),
    } as Response);

    const { result, unmount } = renderHook(() => useTerminalData("device-token"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.weather.forecast).toEqual([]);
    expect(result.current.data?.alerts).toEqual([]);
    expect(result.current.data?.news).toEqual([]);
    expect(result.current.data?.newsCount).toBe(3);

    unmount();
  });
});
