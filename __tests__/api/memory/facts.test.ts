import { describe, it, expect, vi } from "vitest";

const mockGetFacts = vi.fn();
const mockSaveFact = vi.fn();
const mockDeleteFact = vi.fn();

vi.mock("@/modules/memory/services/facts.service", () => ({
  getFacts: (...args: any[]) => mockGetFacts(...args),
  saveFact: (...args: any[]) => mockSaveFact(...args),
  deleteFact: (...args: any[]) => mockDeleteFact(...args),
  getFactCount: vi.fn().mockResolvedValue(5),
  validateMemorySave: vi.fn().mockReturnValue({ allowed: true, mode: "save" }),
}));

vi.mock("@/modules/memory/services/consent.service", () => ({
  hasConsent: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
    }),
  ),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Memory Facts API", () => {
  it("GET /api/memory/facts gibt Array zurueck", async () => {
    mockGetFacts.mockResolvedValue([
      { id: "1", category: "profile", key: "name", value: "Herr Mueller" },
    ]);

    const { GET } = await import("@/app/api/memory/facts/route");
    const response = await GET(
      new Request("http://localhost/api/memory/facts") as any,
    );
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it("POST /api/memory/facts speichert Fakt", async () => {
    mockSaveFact.mockResolvedValue({
      id: "2",
      category: "routine",
      key: "kaffee",
      value: "Kaffee um 8",
    });

    const { POST } = await import("@/app/api/memory/facts/route");
    const response = await POST(
      new Request("http://localhost/api/memory/facts", {
        method: "POST",
        body: JSON.stringify({
          category: "routine",
          key: "kaffee",
          value: "Kaffee um 8",
        }),
      }) as any,
    );
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.key).toBe("kaffee");
  });
});
