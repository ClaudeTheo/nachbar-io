import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { createRouteMockSupabase } from "@/lib/care/__tests__/mock-supabase";

const mockSupabase = createRouteMockSupabase();
const getUserQuarterIdMock = vi.fn();
const getUserHouseholdIdMock = vi.fn();
const loadMapActivityFeedMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

vi.mock("@/lib/quarters/helpers", () => ({
  getUserHouseholdId: (...args: unknown[]) => getUserHouseholdIdMock(...args),
  getUserQuarterId: (...args: unknown[]) => getUserQuarterIdMock(...args),
}));

vi.mock("@/lib/map-activity-feed", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/map-activity-feed")>();
  return {
    ...actual,
    loadMapActivityFeed: (...args: unknown[]) => loadMapActivityFeedMock(...args),
  };
});

function makeGetRequest(url = "http://localhost/api/map/activities") {
  const request = new Request(url, { method: "GET" });
  Object.defineProperty(request, "nextUrl", { value: new URL(url) });
  return request as unknown as NextRequest;
}

describe("GET /api/map/activities", () => {
  beforeEach(() => {
    mockSupabase.reset();
    getUserHouseholdIdMock.mockReset();
    getUserQuarterIdMock.mockReset();
    loadMapActivityFeedMock.mockReset();
  });

  it("gibt 401 ohne Login zurueck", async () => {
    const { GET } = await import("@/app/api/map/activities/route");

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(401);
    expect(loadMapActivityFeedMock).not.toHaveBeenCalled();
  });

  it("liefert ein Array und uebergibt den sicheren Profilmodus an den Feed", async () => {
    mockSupabase.setUser({ id: "u-youth", email: "youth@test.invalid" });
    mockSupabase.addResponse("users", {
      data: { ui_mode: "youth", role: "resident" },
      error: null,
    });
    getUserQuarterIdMock.mockResolvedValue("q-1");
    getUserHouseholdIdMock.mockResolvedValue("hh-youth");
    loadMapActivityFeedMock.mockResolvedValue([
      {
        id: "pin-1",
        type: "learning",
        lat: 47.562,
        lng: 7.945,
        title: "Lerngruppe",
        locationPrecision: "approx_50m",
        visibility: "youth_safe",
        source: "youth_tasks",
      },
    ]);

    const { GET } = await import("@/app/api/map/activities/route");
    const response = await GET(
      makeGetRequest("http://localhost/api/map/activities?mode=active"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(loadMapActivityFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          mode: "youth",
          role: "resident",
          userId: "u-youth",
          householdId: "hh-youth",
        }),
        quarterId: "q-1",
      }),
    );
  });

  it("laesst Erwachsene nicht per Query in den Jugendmodus wechseln", async () => {
    mockSupabase.setUser({ id: "u-active", email: "active@test.invalid" });
    mockSupabase.addResponse("users", {
      data: { ui_mode: "active", role: "resident" },
      error: null,
    });
    getUserQuarterIdMock.mockResolvedValue("q-1");
    getUserHouseholdIdMock.mockResolvedValue("hh-active");
    loadMapActivityFeedMock.mockResolvedValue([]);

    const { GET } = await import("@/app/api/map/activities/route");
    await GET(makeGetRequest("http://localhost/api/map/activities?mode=youth"));

    expect(loadMapActivityFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ mode: "active" }),
      }),
    );
  });
});
