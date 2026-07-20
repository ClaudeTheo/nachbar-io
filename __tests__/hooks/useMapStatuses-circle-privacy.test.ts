import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/lib/map-houses", () => ({
  DEFAULT_HOUSES: [
    {
      id: "map-house-1",
      defaultColor: "green",
    },
  ],
  loadQuarterHouses: vi.fn().mockResolvedValue([
    {
      id: "map-house-1",
      defaultColor: "green",
    },
  ]),
  loadGeoQuarterHouses: vi.fn().mockResolvedValue([]),
  isGeoQuarter: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: mocks.from }),
}));

function fluentResult(data: unknown) {
  const result = { data, error: null };
  const chain: Record<string, unknown> & PromiseLike<typeof result> = {
    then: (resolve) => Promise.resolve(result).then(resolve),
  };
  for (const method of ["select", "in", "not"]) {
    chain[method] = vi.fn(() => chain);
  }
  return chain;
}

import { useMapStatuses } from "@/lib/hooks/useMapStatuses";

describe("useMapStatuses circle privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockImplementation((table: string) => {
      if (table === "households") {
        return fluentResult([
          { id: "household-1", map_house_id: "map-house-1" },
        ]);
      }
      if (table === "household_members") return fluentResult([]);
      return fluentResult([]);
    });
  });

  it("beendet das Laden stabil, wenn RLS keine sichtbaren Mitgliedschaften liefert", async () => {
    const { result } = renderHook(() => useMapStatuses("quarter-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.residentCounts).toEqual({});
    expect(result.current.statuses).toEqual({ "map-house-1": "green" });
    expect(mocks.from).toHaveBeenCalledWith("household_members");
    expect(mocks.from).not.toHaveBeenCalledWith("vacation_modes");
  });
});
