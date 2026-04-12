// __tests__/api/voice/formulate.test.ts
// Tests fuer die KI-Formulierungshilfe API-Route (H-3)

import { describe, it, expect, vi, beforeEach } from "vitest";

// Auth Mock
const mockRequireAuth = vi.fn();
vi.mock("@/lib/care/api-helpers", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  unauthorizedResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    ),
  errorResponse: vi
    .fn()
    .mockImplementation(
      (msg: string, status: number) =>
        new Response(JSON.stringify({ error: msg }), { status }),
    ),
}));

// formulateMessage Mock
const mockFormulateMessage = vi.fn();
vi.mock("@/modules/voice/services/companion-chat.service", () => ({
  formulateMessage: (...args: unknown[]) => mockFormulateMessage(...args),
}));

describe("POST /api/voice/formulate", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRequireAuth.mockReset();
    mockFormulateMessage.mockReset();

    // Default: authentifiziert mit Mock-Supabase
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockRequireAuth.mockResolvedValue({
      user: { id: "test-user-123" },
      supabase: mockSupabase,
    });
  });

  it("gibt 401 zurueck wenn nicht authentifiziert", async () => {
    mockRequireAuth.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/voice/formulate/route");
    const req = new Request("http://localhost/api/voice/formulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: "Hallo", recipientName: "Anna" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("gibt 400 zurueck bei fehlendem Transkript", async () => {
    const { POST } = await import("@/app/api/voice/formulate/route");
    const req = new Request("http://localhost/api/voice/formulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: "", recipientName: "Anna" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("gibt 400 zurueck bei fehlendem Empfaenger", async () => {
    const { POST } = await import("@/app/api/voice/formulate/route");
    const req = new Request("http://localhost/api/voice/formulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: "Hallo Anna", recipientName: "" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("gibt 200 mit formuliertem Text bei gueltigem Request", async () => {
    mockFormulateMessage.mockResolvedValueOnce({
      text: "Liebe Anna, ich wollte Ihnen sagen...",
    });

    const { POST } = await import("@/app/api/voice/formulate/route");
    const req = new Request("http://localhost/api/voice/formulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: "Sag Anna dass ich morgen komme",
        recipientName: "Anna",
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text).toBe("Liebe Anna, ich wollte Ihnen sagen...");
  });

  it("uebergibt mutLevel an formulateMessage", async () => {
    mockFormulateMessage.mockResolvedValueOnce({ text: "Formuliert." });

    const { POST } = await import("@/app/api/voice/formulate/route");
    const req = new Request("http://localhost/api/voice/formulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: "Hallo Anna",
        recipientName: "Anna",
        mutLevel: 3,
      }),
    });
    await POST(req as never);

    expect(mockFormulateMessage).toHaveBeenCalledWith("Hallo Anna", "Anna", 3);
  });
});
