import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mockRequireAuth = vi.fn();
const mockGetAiHelpState = vi.fn();
const mockSetAiAssistanceLevel = vi.fn();
const mockSetAiHelpEnabled = vi.fn();
const mockUpdateConsents = vi.fn();

vi.mock("@/lib/care/api-helpers", () => ({
  requireAuth: () => mockRequireAuth(),
  unauthorizedResponse: () =>
    NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 }),
  successResponse: (data: unknown, status = 200) =>
    NextResponse.json(data, { status }),
  errorResponse: (message: string, status: number) =>
    NextResponse.json({ error: message }, { status }),
}));

vi.mock("@/lib/ai/user-settings", () => ({
  getAiHelpState: (...args: unknown[]) => mockGetAiHelpState(...args),
  setAiAssistanceLevel: (...args: unknown[]) =>
    mockSetAiAssistanceLevel(...args),
  setAiHelpEnabled: (...args: unknown[]) => mockSetAiHelpEnabled(...args),
}));

vi.mock("@/modules/care/services/consent-routes.service", () => ({
  updateConsents: (...args: unknown[]) => mockUpdateConsents(...args),
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/settings/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("/api/settings/ai level API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRequireAuth.mockResolvedValue({
      supabase: { from: vi.fn() },
      user: { id: "user-1" },
    });
    mockGetAiHelpState.mockResolvedValue({
      enabled: true,
      assistanceLevel: "basic",
    });
    mockSetAiAssistanceLevel.mockResolvedValue({
      enabled: true,
      assistanceLevel: "everyday",
    });
    mockSetAiHelpEnabled.mockResolvedValue({
      enabled: true,
      assistanceLevel: "basic",
    });
  });

  it("GET returns enabled and assistanceLevel", async () => {
    const { GET } = await import("@/app/api/settings/ai/route");
    const response = await GET({} as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ enabled: true, assistanceLevel: "basic" });
    expect(mockGetAiHelpState).toHaveBeenCalledWith(expect.anything(), "user-1");
  });

  it("POST ai_assistance_level delegates to setAiAssistanceLevel", async () => {
    const { POST } = await import("@/app/api/settings/ai/route");
    const response = await POST(makeRequest({ ai_assistance_level: "everyday" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ enabled: true, assistanceLevel: "everyday" });
    expect(mockSetAiAssistanceLevel).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "everyday",
      "settings",
    );
    expect(mockUpdateConsents).not.toHaveBeenCalled();
  });

  it("POST invalid ai_assistance_level returns 400", async () => {
    const { POST } = await import("@/app/api/settings/ai/route");
    const response = await POST(makeRequest({ ai_assistance_level: "personal" }));

    expect(response.status).toBe(400);
    expect(mockSetAiAssistanceLevel).not.toHaveBeenCalled();
  });

  it("POST legacy ai_enabled delegates to setAiHelpEnabled", async () => {
    const { POST } = await import("@/app/api/settings/ai/route");
    const response = await POST(makeRequest({ ai_enabled: true }));

    expect(response.status).toBe(200);
    expect(mockSetAiHelpEnabled).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      true,
      "settings",
    );
    expect(mockUpdateConsents).not.toHaveBeenCalled();
  });

  it("POST empty body returns 400", async () => {
    const { POST } = await import("@/app/api/settings/ai/route");
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
  });
});
