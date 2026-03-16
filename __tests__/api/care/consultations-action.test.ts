import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase
const mockSingle = vi.fn();
const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "patient-1" } },
      }),
    },
    from: () => ({
      select: mockSelect,
      update: mockUpdate,
    }),
  }),
}));

vi.mock("@/lib/care/logger", () => ({
  createCareLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    done: vi.fn(),
  }),
}));

describe("PATCH /api/care/consultations/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gibt 400 bei ungueltiger Aktion", async () => {
    const { PATCH } = await import(
      "@/app/api/care/consultations/[id]/route"
    );
    const req = new Request("http://localhost/api/care/consultations/123", {
      method: "PATCH",
      body: JSON.stringify({ action: "invalid" }),
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "123" }),
    });
    expect(res.status).toBe(400);
  });
});
