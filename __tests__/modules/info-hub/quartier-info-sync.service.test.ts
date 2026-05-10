import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runQuartierInfoSync } from "@/modules/info-hub/services/quartier-info-sync.service";
import { fetchWeather } from "@/modules/info-hub/services/weather-client";
import { fetchPollenData } from "@/modules/info-hub/services/pollen-client";
import { fetchDepartures } from "@/modules/info-hub/services/oepnv-client";

vi.mock("@/modules/info-hub/services/weather-client", () => ({
  fetchWeather: vi.fn(),
}));

vi.mock("@/modules/info-hub/services/pollen-client", () => ({
  fetchPollenData: vi.fn(),
  isLegacyDefaultPollenRegion: vi.fn(() => false),
}));

vi.mock("@/modules/info-hub/services/oepnv-client", () => ({
  fetchDepartures: vi.fn(),
}));

function createSupabaseMock(options?: {
  weatherUpsertError?: { message: string };
  oepnvStops?: Array<{ id: string; name: string }>;
  oepnvUpsertError?: { message: string };
}) {
  const upsertPayloads: Array<Record<string, unknown>> = [];

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "quarters") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ id: "q-bs", center_lat: 47.5535, center_lng: 7.964 }],
            error: null,
          }),
        };
      }

      if (table === "municipal_config") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { oepnv_stops: options?.oepnvStops ?? [] },
            error: null,
          }),
        };
      }

      if (table === "quartier_info_cache") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { fetched_at: new Date().toISOString(), data: {} },
            error: null,
          }),
          upsert: vi.fn((payload: Record<string, unknown>) => {
            upsertPayloads.push(payload);
            if (payload.source === "weather") {
              return Promise.resolve({
                data: null,
                error: options?.weatherUpsertError ?? null,
              });
            }
            if (payload.source === "oepnv") {
              return Promise.resolve({
                data: null,
                error: options?.oepnvUpsertError ?? null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };

  return {
    supabase: supabase as unknown as SupabaseClient,
    upsertPayloads,
  };
}

describe("runQuartierInfoSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.mocked(fetchWeather).mockResolvedValue({
      temp: 17,
      description: "bewoelkt",
      icon: "cloud",
      forecast: [],
    });
    vi.mocked(fetchPollenData).mockResolvedValue(null);
    vi.mocked(fetchDepartures).mockResolvedValue({
      id: "stop-1",
      name: "Bahnhof",
      departures: [],
    });
  });

  it("zaehlt Wetter-Upsert-Fehler nicht als erfolgreichen Cache-Write", async () => {
    const { supabase } = createSupabaseMock({
      weatherUpsertError: { message: "new row violates row-level security" },
    });

    const result = await runQuartierInfoSync(supabase);

    expect(result.weather).toBe(0);
    expect(result.errors).toBe(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("\"event\":\"weather_error\""),
    );
  });

  it("zaehlt OEPNV-Upsert-Fehler nicht als erfolgreichen Cache-Write", async () => {
    const { supabase } = createSupabaseMock({
      oepnvStops: [{ id: "stop-1", name: "Bahnhof" }],
      oepnvUpsertError: {
        message: 'new row violates check constraint "quartier_info_cache_source_check"',
      },
    });

    const result = await runQuartierInfoSync(supabase);

    expect(result.oepnv).toBe(0);
    expect(result.errors).toBe(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("\"event\":\"oepnv_error\""),
    );
  });
});
