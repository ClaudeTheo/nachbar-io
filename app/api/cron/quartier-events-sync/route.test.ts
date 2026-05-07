import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getAdminSupabase: vi.fn(() => ({ from: vi.fn() })),
  runQuartierEventsSync: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: mocks.getAdminSupabase,
}));

vi.mock("@/modules/info-hub/services/quartier-events-sync.service", () => ({
  runQuartierEventsSync: mocks.runQuartierEventsSync,
}));

import { GET } from "./route";

function createRequest(secret?: string) {
  const headers = new Headers();
  if (secret) headers.set("authorization", `Bearer ${secret}`);
  return new NextRequest("http://localhost/api/cron/quartier-events-sync", {
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  mocks.runQuartierEventsSync.mockResolvedValue({
    message: "Quartier-Events-Sync abgeschlossen",
    requestId: "request-1",
    quarters: 1,
    updated: 1,
    events: 2,
    errors: 0,
  });
});

describe("GET /api/cron/quartier-events-sync", () => {
  it("gibt 401 ohne Cron-Secret zurueck", async () => {
    const res = await GET(createRequest());

    expect(res.status).toBe(401);
    expect(mocks.runQuartierEventsSync).not.toHaveBeenCalled();
  });

  it("gibt 401 mit falschem Cron-Secret zurueck", async () => {
    const res = await GET(createRequest("wrong"));

    expect(res.status).toBe(401);
    expect(mocks.runQuartierEventsSync).not.toHaveBeenCalled();
  });

  it("ruft den Quartier-Events-Sync mit Admin-Supabase auf", async () => {
    const res = await GET(createRequest("test-cron-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ updated: 1, events: 2 });
    expect(mocks.getAdminSupabase).toHaveBeenCalledOnce();
    expect(mocks.runQuartierEventsSync).toHaveBeenCalledWith(
      mocks.getAdminSupabase.mock.results[0].value,
    );
  });
});
