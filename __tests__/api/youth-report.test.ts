// __tests__/api/youth-report.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockInsert = vi.fn(() => ({
  select: vi.fn(() => ({ single: vi.fn() })),
}));
const mockFrom = vi.fn(() => ({
  insert: mockInsert,
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => mockSelect),
    })),
  })),
}));

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: mockFrom,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

// Feature-Flag: YOUTH_MODULE immer aktiv in Tests
vi.mock("@/lib/feature-flags-server", () => ({
  isFeatureEnabledServer: vi.fn().mockResolvedValue(true),
}));

import { POST } from "@/app/api/youth/report/route";
import { NextRequest } from "next/server";

function createRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/youth/report", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/youth/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
  });

  it("lehnt ab wenn kein authentifizierter User", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(
      createRequest({ target_type: "task", target_id: "abc", reason: "spam" }),
    );
    expect(res.status).toBe(401);
  });

  it("lehnt ab wenn Pflichtfelder fehlen", async () => {
    const res = await POST(createRequest({ target_type: "task" }));
    expect(res.status).toBe(400);
  });

  it("lehnt ungueltige target_type ab", async () => {
    const res = await POST(
      createRequest({
        target_type: "invalid",
        target_id: "abc",
        reason: "spam",
      }),
    );
    expect(res.status).toBe(400);
  });
});
