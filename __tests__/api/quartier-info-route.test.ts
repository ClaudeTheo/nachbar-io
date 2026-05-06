import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAuth = vi.fn();
const mockUnauthorizedResponse = vi.fn(
  () =>
    new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
      status: 401,
    }),
);
const mockCreateClient = vi.fn();
const mockGetQuartierInfo = vi.fn();

vi.mock("@/lib/care/api-helpers", () => ({
  requireAuth: () => mockRequireAuth(),
  unauthorizedResponse: () => mockUnauthorizedResponse(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

vi.mock("@/lib/services/quartier-info.service", () => ({
  getQuartierInfo: (...args: unknown[]) => mockGetQuartierInfo(...args),
}));

function makeRequest() {
  return new NextRequest("http://localhost/api/quartier-info?quarter_id=q-1");
}

describe("GET /api/quartier-info", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role");
    mockRequireAuth.mockResolvedValue({
      user: { id: "user-1" },
      supabase: {},
    });
    mockCreateClient.mockReturnValue({ from: vi.fn() });
    mockGetQuartierInfo.mockResolvedValue({ weather: null, nina: [] });
  });

  it("blockiert unauthentifizierte Requests bevor der Service-Role-Client erstellt wird", async () => {
    mockRequireAuth.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/quartier-info/route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(mockUnauthorizedResponse).toHaveBeenCalled();
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockGetQuartierInfo).not.toHaveBeenCalled();
  });

  it("liefert Quartier-Info fuer authentifizierte Nutzer", async () => {
    const { GET } = await import("@/app/api/quartier-info/route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-role",
    );
    expect(mockGetQuartierInfo).toHaveBeenCalledWith(expect.anything(), "q-1");
    await expect(res.json()).resolves.toEqual({ weather: null, nina: [] });
  });
});
