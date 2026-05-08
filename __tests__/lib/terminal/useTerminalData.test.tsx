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
    expect(result.current.data?.unreadCount).toBe(0);
    expect(result.current.data?.newsCount).toBe(0);

    unmount();
  });

  it("filtert kaputte Eintraege aus Device-Status-Listen", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        weather: {
          temp: 18,
          icon: 123,
          forecast: [
            { day: "Mo", tempMax: 20, icon: "sun" },
            null,
            { day: "Di", tempMax: "warm", icon: "rain" },
            { day: "Mi", tempMax: 22, icon: null },
          ],
        },
        alerts: [
          {
            id: "alert-1",
            category: "community",
            title: "Hausflur wird gereinigt",
            body: "Bitte Schuhe wegstellen.",
            isEmergency: false,
            createdAt: "2026-05-07T08:00:00.000Z",
          },
          null,
          {
            id: "alert-2",
            category: "community",
            title: null,
            body: "Kaputter Titel",
            isEmergency: false,
            createdAt: "2026-05-07T08:00:00.000Z",
          },
          {
            id: "alert-3",
            category: "community",
            title: "Kaputtes Datum",
            body: "Wird gefiltert.",
            isEmergency: false,
            createdAt: "kein Datum",
          },
        ],
        news: [
          {
            id: "news-1",
            title: "Wochenmarkt am Samstag",
            summary: null,
            category: "community",
            categoryLabel: "Quartier",
            relevance: 3,
            publishedAt: "2026-05-07T09:00:00.000Z",
          },
          null,
          {
            id: "news-2",
            title: undefined,
            summary: "Kaputter Titel",
            category: "community",
            categoryLabel: "Quartier",
            relevance: 1,
            publishedAt: "2026-05-07T09:00:00.000Z",
          },
          {
            id: "news-3",
            title: "Kaputte Relevanz",
            summary: null,
            category: "community",
            categoryLabel: "Quartier",
            relevance: "hoch",
            publishedAt: "2026-05-07T09:00:00.000Z",
          },
          {
            id: "news-4",
            title: "Kaputtes Datum",
            summary: null,
            category: "community",
            categoryLabel: "Quartier",
            relevance: 1,
            publishedAt: "kein Datum",
          },
        ],
        newsCount: -5,
        lastCheckin: "kein Datum",
        nextAppointment: "2026-05-07T10:00:00.000Z",
        unreadCount: "2",
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

    expect(result.current.data?.weather.icon).toBe("cloud");
    expect(result.current.data?.weather.forecast).toEqual([
      { day: "Mo", tempMax: 20, icon: "sun" },
    ]);
    expect(result.current.data?.alerts).toEqual([
      {
        id: "alert-1",
        category: "community",
        title: "Hausflur wird gereinigt",
        body: "Bitte Schuhe wegstellen.",
        isEmergency: false,
        createdAt: "2026-05-07T08:00:00.000Z",
      },
    ]);
    expect(result.current.data?.news).toEqual([
      {
        id: "news-1",
        title: "Wochenmarkt am Samstag",
        summary: null,
        category: "community",
        categoryLabel: "Quartier",
        relevance: 3,
        publishedAt: "2026-05-07T09:00:00.000Z",
      },
    ]);
    expect(result.current.data?.newsCount).toBe(1);
    expect(result.current.data?.lastCheckin).toBeNull();
    expect(result.current.data?.unreadCount).toBe(1);

    unmount();
  });

  it("trimmt Alert-Titel aus der Device-Status-API", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        weather: {
          temp: 18,
          icon: "sun",
          forecast: [],
        },
        alerts: [
          {
            id: "alert-1",
            category: "community",
            title: "  Hausflur wird gereinigt  ",
            body: "Bitte Schuhe wegstellen.",
            isEmergency: false,
            createdAt: "2026-05-07T08:00:00.000Z",
          },
        ],
        news: [],
        lastCheckin: null,
        nextAppointment: null,
        userName: "Frau Mueller",
        greeting: "Guten Tag",
        photosCount: 0,
        remindersCount: 0,
        stickiesCount: 0,
        appointmentsToday: 0,
      }),
    } as Response);

    const { result, unmount } = renderHook(() => useTerminalData("device-token"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.alerts[0]?.title).toBe("Hausflur wird gereinigt");

    unmount();
  });

  it("trimmt News-Titel aus der Device-Status-API", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        weather: {
          temp: 18,
          icon: "sun",
          forecast: [],
        },
        alerts: [],
        news: [
          {
            id: "news-1",
            title: "  Wochenmarkt am Samstag  ",
            summary: null,
            category: "community",
            categoryLabel: "Quartier",
            relevance: 3,
            publishedAt: "2026-05-07T09:00:00.000Z",
          },
        ],
        lastCheckin: null,
        nextAppointment: null,
        userName: "Frau Mueller",
        greeting: "Guten Tag",
        photosCount: 0,
        remindersCount: 0,
        stickiesCount: 0,
        appointmentsToday: 0,
      }),
    } as Response);

    const { result, unmount } = renderHook(() => useTerminalData("device-token"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.news[0]?.title).toBe("Wochenmarkt am Samstag");

    unmount();
  });
});
