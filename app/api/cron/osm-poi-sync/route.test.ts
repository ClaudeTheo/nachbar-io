import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getAdminSupabase: vi.fn(() => ({ from: vi.fn() })),
  runOsmPoiSync: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: mocks.getAdminSupabase,
}));

vi.mock("@/modules/info-hub/services/osm-poi-sync.service", () => ({
  runOsmPoiSync: mocks.runOsmPoiSync,
}));

import { GET } from "./route";

function createRequest(secret?: string) {
  const headers = new Headers();
  if (secret) headers.set("authorization", `Bearer ${secret}`);
  return new NextRequest("http://localhost/api/cron/osm-poi-sync", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  mocks.runOsmPoiSync.mockResolvedValue({
    message: "OSM-POI-Sync abgeschlossen",
    requestId: "request-1",
    quarters: 1,
    updated: 1,
    pharmacies: 2,
    errors: 0,
  });
});

describe("GET /api/cron/osm-poi-sync", () => {
  it("gibt 401 ohne Cron-Secret zurueck", async () => {
    const res = await GET(createRequest());

    expect(res.status).toBe(401);
    expect(mocks.runOsmPoiSync).not.toHaveBeenCalled();
  });

  it("gibt 401 mit falschem Cron-Secret zurueck", async () => {
    const res = await GET(createRequest("wrong"));

    expect(res.status).toBe(401);
    expect(mocks.runOsmPoiSync).not.toHaveBeenCalled();
  });

  it("ruft den OSM-POI-Sync mit Admin-Supabase auf", async () => {
    const res = await GET(createRequest("test-cron-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ updated: 1, pharmacies: 2 });
    expect(mocks.getAdminSupabase).toHaveBeenCalledOnce();
    expect(mocks.runOsmPoiSync).toHaveBeenCalledWith(
      mocks.getAdminSupabase.mock.results[0].value,
    );
  });
});
