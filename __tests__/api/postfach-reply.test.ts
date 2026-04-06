// Tests: POST /api/postfach/[id]/antwort — Buerger-Rueckantwort im Thread
// Test 1: Erfolgreiche Antwort (Encryption + korrekte Felder)
// Test 2: Fremd-Thread abgelehnt (403)
// Test 3: Rate-Limit greift

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => ({
    from: mockFrom,
  })),
}));

vi.mock("@/lib/civic/encryption", () => ({
  encryptCivicField: vi.fn((text: string) => `civic:encrypted:${text}`),
}));

const CITIZEN_ID = "citizen-1";
const ROOT_MSG = {
  id: "root-1",
  org_id: "org-1",
  citizen_user_id: CITIZEN_ID,
  subject: "Strassenbeleuchtung",
  thread_id: "root-1",
};

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/postfach/root-1/antwort", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

function setupMocks(overrides: {
  root?: typeof ROOT_MSG | null;
  messageCount?: number;
  insertError?: boolean;
}) {
  const root = overrides.root ?? ROOT_MSG;
  let insertedData: Record<string, unknown> | null = null;

  mockFrom.mockImplementation((table: string) => {
    if (table === "civic_messages") {
      return {
        select: (fields: string, opts?: { count?: string; head?: boolean }) => {
          // COUNT query (Rate-Limit)
          if (opts?.count === "exact") {
            return {
              eq: () => ({
                gte: () =>
                  Promise.resolve({
                    count: overrides.messageCount ?? 0,
                    error: null,
                  }),
              }),
            };
          }
          // Root-Abfrage
          return {
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: root,
                  error: root ? null : { message: "not found" },
                }),
            }),
          };
        },
        insert: (data: Record<string, unknown>) => {
          insertedData = data;
          return {
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: overrides.insertError
                    ? null
                    : { id: data.id, created_at: new Date().toISOString() },
                  error: overrides.insertError
                    ? { message: "insert failed" }
                    : null,
                }),
            }),
          };
        },
      };
    }
    return {};
  });

  return { getInsertedData: () => insertedData };
}

describe("POST /api/postfach/[id]/antwort (Buerger)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("sendet verschluesselte Antwort mit korrekten Feldern", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: CITIZEN_ID } } });
    const { getInsertedData } = setupMocks({});

    const { POST } = await import("@/app/api/postfach/[id]/antwort/route");
    const params = Promise.resolve({ id: "root-1" });
    const res = await POST(
      createRequest({ body: "Vielen Dank fuer die schnelle Bearbeitung." }),
      { params },
    );

    expect(res.status).toBe(201);

    const data = getInsertedData();
    expect(data).not.toBeNull();
    expect(data!.direction).toBe("citizen_to_staff");
    expect(data!.thread_id).toBe("root-1");
    expect(data!.sender_user_id).toBe(CITIZEN_ID);
    expect(data!.citizen_user_id).toBe(CITIZEN_ID);
    expect(data!.subject).toBe("Strassenbeleuchtung");
    expect(data!.body_encrypted).toContain("civic:encrypted:");
  });

  it("lehnt Antwort auf fremden Thread ab (403)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "other-citizen" } },
    });
    setupMocks({});

    const { POST } = await import("@/app/api/postfach/[id]/antwort/route");
    const params = Promise.resolve({ id: "root-1" });
    const res = await POST(
      createRequest({ body: "Versuch in fremdem Thread zu antworten" }),
      { params },
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Berechtigung");
  });

  it("gibt 429 bei Rate-Limit-Ueberschreitung", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: CITIZEN_ID } } });
    setupMocks({ messageCount: 5 });

    const { POST } = await import("@/app/api/postfach/[id]/antwort/route");
    const params = Promise.resolve({ id: "root-1" });
    const res = await POST(
      createRequest({ body: "Sechste Nachricht am selben Tag hier" }),
      { params },
    );

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("Tageslimit");
  });
});
