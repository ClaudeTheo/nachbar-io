import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";

const apiMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireSubscription: vi.fn(),
  getAdminSupabase: vi.fn(),
  updateAutoAnswerSettings: vi.fn(),
}));

vi.mock("@/lib/care/api-helpers", () => ({
  requireAuth: apiMocks.requireAuth,
  requireSubscription: apiMocks.requireSubscription,
  unauthorizedResponse: () =>
    Response.json({ error: "Nicht authentifiziert" }, { status: 401 }),
  errorResponse: (message: string, status: number) =>
    Response.json({ error: message }, { status }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: apiMocks.getAdminSupabase,
}));

vi.mock("@/modules/care/services/caregiver/caregiver-misc.service", () => ({
  getAutoAnswerSettings: vi.fn(),
  updateAutoAnswerSettings: apiMocks.updateAutoAnswerSettings,
}));

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/caregiver/auto-answer", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/caregiver/auto-answer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bleibt authentifiziert, prueft Plus und nutzt den Admin-Client fuer das Update", async () => {
    const authSupabase = { from: vi.fn() };
    const adminSupabase = { from: vi.fn() };
    apiMocks.requireAuth.mockResolvedValue({
      supabase: authSupabase,
      user: { id: "caregiver-1" },
    });
    apiMocks.requireSubscription.mockResolvedValue({
      plan: "plus",
      status: "active",
    });
    apiMocks.getAdminSupabase.mockReturnValue(adminSupabase);
    apiMocks.updateAutoAnswerSettings.mockResolvedValue({ ok: true });

    const response = await PATCH(
      patchRequest({
        linkId: "link-1",
        autoAnswerAllowed: true,
        autoAnswerStart: "08:00",
        autoAnswerEnd: "20:00",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(apiMocks.requireSubscription).toHaveBeenCalledWith(
      authSupabase,
      "caregiver-1",
      "plus",
    );
    expect(apiMocks.updateAutoAnswerSettings).toHaveBeenCalledWith(
      authSupabase,
      adminSupabase,
      "caregiver-1",
      {
        linkId: "link-1",
        autoAnswerAllowed: true,
        autoAnswerStart: "08:00",
        autoAnswerEnd: "20:00",
      },
    );
  });
});
