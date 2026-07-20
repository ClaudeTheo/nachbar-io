import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  getAdminSupabase: vi.fn(),
}));

vi.mock("@/lib/care/api-helpers", () => ({
  requireAuth: mocks.requireAuth,
  errorResponse: (message: string, status: number) =>
    Response.json({ error: message }, { status }),
  successResponse: (data: unknown) => Response.json(data),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: mocks.getAdminSupabase,
}));

function singleResult(data: unknown) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "not", "limit"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(() =>
    Promise.resolve({ data, error: null }),
  );
  return chain;
}

import { GET } from "@/app/api/care/household/route";

describe("GET /api/care/household", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("liest nach Caregiver-Link-Pruefung den fremden Haushalt nur serverseitig", async () => {
    const userFrom = vi.fn((table: string) => {
      if (table === "caregiver_links") return singleResult({ id: "link-1" });
      return singleResult(null);
    });
    const adminFrom = vi.fn(() => singleResult({ household_id: "house-senior" }));

    mocks.requireAuth.mockResolvedValue({
      supabase: { from: userFrom },
      user: { id: "caregiver-1" },
    });
    mocks.getAdminSupabase.mockReturnValue({ from: adminFrom });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/care/household?resident_id=senior-1",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      household_id: "house-senior",
    });
    expect(userFrom).toHaveBeenCalledTimes(1);
    expect(adminFrom).toHaveBeenCalledWith("household_members");
  });

  it("gibt ohne aktiven Caregiver-Link keine Admin-Abfrage frei", async () => {
    const userFrom = vi.fn(() => singleResult(null));
    const adminFrom = vi.fn();

    mocks.requireAuth.mockResolvedValue({
      supabase: { from: userFrom },
      user: { id: "caregiver-1" },
    });
    mocks.getAdminSupabase.mockReturnValue({ from: adminFrom });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/care/household?resident_id=senior-1",
      ),
    );

    expect(response.status).toBe(403);
    expect(mocks.getAdminSupabase).not.toHaveBeenCalled();
    expect(adminFrom).not.toHaveBeenCalled();
  });
});
