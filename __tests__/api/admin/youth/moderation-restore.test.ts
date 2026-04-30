// __tests__/api/admin/youth/moderation-restore.test.ts
// Admin Youth-Moderation: POST /api/admin/youth/moderation/restore

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MockChainable,
  SupabaseMockChainMethod,
} from "@/__tests__/_helpers/mock-types";

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
  const obj: Partial<MockChainable> = {};
  const methods: SupabaseMockChainMethod[] = [
    "select",
    "eq",
    "neq",
    "gt",
    "lt",
    "order",
    "limit",
    "single",
    "maybeSingle",
    "update",
    "set",
  ];
  for (const m of methods) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  obj.then = (onfulfilled, onrejected) =>
    Promise.resolve(resolvedValue).then(onfulfilled, onrejected);
  return obj as MockChainable;
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
  return new NextRequest(
    "http://localhost:3000/api/admin/youth/moderation/restore",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("POST /api/admin/youth/moderation/restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("401 wenn nicht authentifiziert", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient({ user: null, isAdmin: false }) as unknown as SupabaseClient,
    );

    const { POST } =
      await import("@/app/api/admin/youth/moderation/restore/route");
    const req = makeRequest({ itemId: "mod-1" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Nicht autorisiert");
  });

  it("400 wenn itemId fehlt", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient({
        user: mockAdminUser,
        isAdmin: true,
      }) as unknown as SupabaseClient,
    );

    const { POST } =
      await import("@/app/api/admin/youth/moderation/restore/route");
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("itemId");
  });

  it("200 bei erfolgreichem Restore (append-only)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient({
        user: mockAdminUser,
        isAdmin: true,
      }) as unknown as SupabaseClient,
    );

    // Admin-Supabase-Mock:
    // 1. from("youth_moderation_log").select().eq().single() → suspended-Eintrag
    // 2. from("youth_moderation_log").insert() → Erfolg
    let callCount = 0;
    const mockAdminDb = {
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // SELECT: bestehenden suspended-Eintrag laden
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "mod-1",
                    action: "suspended",
                    target_type: "task",
                    target_id: "task-1",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        // INSERT: neuen restored-Eintrag
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    };
    vi.mocked(getAdminSupabase).mockReturnValue(
      mockAdminDb as unknown as SupabaseClient,
    );

    const { POST } =
      await import("@/app/api/admin/youth/moderation/restore/route");
    const req = makeRequest({ itemId: "mod-1" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("400 wenn Eintrag nicht suspended ist", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient({
        user: mockAdminUser,
        isAdmin: true,
      }) as unknown as SupabaseClient,
    );

    const mockAdminDb = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "mod-2",
                action: "flagged",
                target_type: "task",
                target_id: "task-2",
              },
              error: null,
            }),
          }),
        }),
      })),
    };
    vi.mocked(getAdminSupabase).mockReturnValue(
      mockAdminDb as unknown as SupabaseClient,
    );

    const { POST } =
      await import("@/app/api/admin/youth/moderation/restore/route");
    const req = makeRequest({ itemId: "mod-2" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
