import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

function makeJsonRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/kiosk/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/kiosk/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("bestaetigt QR-Sessions mit display_name aus users", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "anna@test.local" } },
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { display_name: "Anna T." },
            error: null,
          }),
        }),
      }),
    });

    const route = await import("@/app/api/kiosk/login/route");
    const createSessionRes = await route.GET(
      new NextRequest("http://localhost/api/kiosk/login?action=create_session"),
    );
    const { session_id: sessionId } = await createSessionRes.json();

    const response = await route.POST(
      makeJsonRequest({ method: "qr_confirm", session_id: sessionId }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("confirmed");

    const pollResponse = await route.POST(
      makeJsonRequest({ method: "qr_poll", session_id: sessionId }),
    );
    expect(pollResponse.status).toBe(200);
    const pollBody = await pollResponse.json();
    expect(pollBody.status).toBe("confirmed");
    expect(pollBody.display_name).toBe("Anna T.");
  });

  it("validiert PINs gegen users.settings statt gegen profiles", async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        contains: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [
              {
                id: "user-1",
                display_name: "Anna T.",
                settings: { kiosk_pin: "4821", theme: "dark" },
              },
            ],
            error: null,
          }),
        }),
      }),
    });

    const { POST } = await import("@/app/api/kiosk/login/route");
    const response = await POST(makeJsonRequest({ method: "pin", pin: "4821" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      status: "confirmed",
      user_id: "user-1",
      display_name: "Anna T.",
    });
  });

  it("akzeptiert keine universelle Demo-PIN mehr", async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        contains: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    const { POST } = await import("@/app/api/kiosk/login/route");
    const response = await POST(makeJsonRequest({ method: "pin", pin: "1234" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      status: "invalid",
      message: "Falsche PIN",
    });
  });
});
