import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getAdminSupabase: vi.fn(() => ({ from: vi.fn() })),
  buildAiTestUsersCleanupDryRunReport: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: mocks.getAdminSupabase,
}));

vi.mock("@/lib/admin/ai-test-users-cleanup-dry-run", () => ({
  buildAiTestUsersCleanupDryRunReport:
    mocks.buildAiTestUsersCleanupDryRunReport,
}));

import { GET } from "./route";

function createRequest(secret?: string) {
  const headers = new Headers();
  if (secret) headers.set("authorization", `Bearer ${secret}`);
  return new NextRequest("http://localhost/api/cron/ai-test-cleanup-dry-run", {
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  mocks.buildAiTestUsersCleanupDryRunReport.mockResolvedValue({
    mode: "dry-run",
    generatedAt: "2026-05-05T13:50:00.000Z",
    aiTestUsers: [],
    unsafeNameOnlyMatches: [],
    touchedHouseholds: [],
    referenceCounts: [],
  });
});

describe("GET /api/cron/ai-test-cleanup-dry-run", () => {
  it("gibt 401 ohne Cron-Secret zurueck", async () => {
    const res = await GET(createRequest());

    expect(res.status).toBe(401);
    expect(mocks.buildAiTestUsersCleanupDryRunReport).not.toHaveBeenCalled();
  });

  it("gibt 401 mit falschem Cron-Secret zurueck", async () => {
    const res = await GET(createRequest("wrong"));

    expect(res.status).toBe(401);
    expect(mocks.buildAiTestUsersCleanupDryRunReport).not.toHaveBeenCalled();
  });

  it("gibt 503 zurueck wenn CRON_SECRET nicht gesetzt ist", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(createRequest("any"));

    expect(res.status).toBe(401);
    expect(mocks.buildAiTestUsersCleanupDryRunReport).not.toHaveBeenCalled();
  });

  it("liefert Dry-Run-Bericht mit korrektem Cron-Secret", async () => {
    const res = await GET(createRequest("test-cron-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      mode: "dry-run",
      generatedAt: "2026-05-05T13:50:00.000Z",
      aiTestUsers: [],
    });
    expect(mocks.getAdminSupabase).toHaveBeenCalledOnce();
    expect(mocks.buildAiTestUsersCleanupDryRunReport).toHaveBeenCalledOnce();
  });

  it("gibt 500 wenn Report-Builder wirft (z.B. Admin-Block)", async () => {
    mocks.buildAiTestUsersCleanupDryRunReport.mockRejectedValue(
      new Error(
        "Dry-Run abgebrochen: 1 Admin-Nutzer als AI-Testkandidat gefunden",
      ),
    );

    const res = await GET(createRequest("test-cron-secret"));

    expect(res.status).toBe(500);
  });
});
