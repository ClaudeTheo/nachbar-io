// __tests__/api/admin/youth/moderation-restore.test.ts
// Admin Youth-Moderation: POST /api/admin/youth/moderation/restore

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock-Daten ---
const mockAdminUser = { id: "admin-1" };

// --- Helper: baut einen Mock-Supabase-Client (Auth-Pruefung) ---
function buildMockClient(opts: {
  user: { id: string } | null;
  isAdmin: boolean;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: opts.user } }),
    },
    from: vi.fn((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: opts.isAdmin ? { is_admin: true } : { is_admin: false },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }),
  };
}

// --- Helper: chainable Mock fuer Supabase-Query ---
function chainable(resolvedValue: unknown) {
  const obj: Record<string, any> = {};
  const methods = ["select", "eq", "neq", "gt", "lt", "order", "limit", "single", "maybeSingle", "update", "set"];
  for (const m of methods) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  obj.then = vi.fn((resolve: any) => resolve(resolvedValue));
  return obj;
}

// --- Mocks ---
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

// Helper: erstellt eine NextRequest mit JSON-Body
function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/youth/moderation/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/youth/moderation/restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("401 wenn nicht authentifiziert", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient({ user: null, isAdmin: false }) as any
    );

    const { POST } = await import("@/app/api/admin/youth/moderation/restore/route");
    const req = makeRequest({ itemId: "mod-1" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Nicht autorisiert");
  });

  it("400 wenn itemId fehlt", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient({ user: mockAdminUser, isAdmin: true }) as any
    );

    const { POST } = await import("@/app/api/admin/youth/moderation/restore/route");
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("itemId");
  });

  it("200 bei erfolgreichem Restore", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient({ user: mockAdminUser, isAdmin: true }) as any
    );

    // Admin-Supabase-Mock: update().eq() -> Erfolg
    const mockAdminDb = {
      from: vi.fn(() => chainable({ data: null, error: null })),
    };
    vi.mocked(getAdminSupabase).mockReturnValue(mockAdminDb as any);

    const { POST } = await import("@/app/api/admin/youth/moderation/restore/route");
    const req = makeRequest({ itemId: "mod-1" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
