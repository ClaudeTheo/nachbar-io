// Tests: POST /api/postfach — Buerger→Rathaus Nachricht
// Validierung, Rate-Limiting, Encryption, Org-Mapping
// Aktualisiert: FormData statt JSON (Schritt 4 Attachments)

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase Clients
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

vi.mock("@/lib/civic/attachment-utils", () => ({
  validateAttachmentFiles: vi.fn(() => ({ files: [] })),
  uploadAttachments: vi.fn(async () => ({})),
}));

// Hilfsfunktion: FormData-Request erstellen
function makeFormDataRequest(fields: Record<string, string>): Request {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  return new Request("http://localhost/api/postfach", {
    method: "POST",
    body: fd,
  });
}

function setupAdminChain(responses: Record<string, unknown>) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "household_members") {
      return {
        select: () => ({
          eq: () => ({
            not: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: responses.household
                      ? {
                          households: {
                            quarter_id: (
                              responses.household as { quarter_id: string }
                            ).quarter_id,
                          },
                        }
                      : null,
                    error: responses.household
                      ? null
                      : { message: "not found" },
                  }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === "civic_organizations") {
      return {
        select: () => ({
          contains: () => ({
            eq: () => ({
              limit: () =>
                Promise.resolve({ data: responses.orgs, error: null }),
            }),
          }),
        }),
      };
    }
    if (table === "civic_messages") {
      if (!responses.insertCalled) {
        return {
          select: () => ({
            eq: () => ({
              gte: () =>
                Promise.resolve({
                  count: responses.messageCount ?? 0,
                  error: null,
                }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () => {
                responses.insertCalled = true;
                return Promise.resolve({
                  data: {
                    id: "msg-1",
                    subject: "Test",
                    status: "sent",
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                });
              },
            }),
          }),
        };
      }
      return {
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: "msg-1",
                  subject: "Test",
                  status: "sent",
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
          }),
        }),
      };
    }
    return {
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    };
  });
}

describe("POST /api/postfach", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gibt 401 wenn nicht eingeloggt", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import("@/app/api/postfach/route");
    const req = makeFormDataRequest({
      subject: "Test",
      body: "Testnachricht hier",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("gibt 400 bei zu kurzem Betreff", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    setupAdminChain({
      household: { quarter_id: "q1" },
      orgs: [{ id: "org1", name: "Bad Saeckingen" }],
      messageCount: 0,
    });

    const { POST } = await import("@/app/api/postfach/route");
    const req = makeFormDataRequest({
      subject: "Hi",
      body: "Testnachricht hier genug",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Betreff");
  });

  it("gibt 400 bei zu kurzer Nachricht", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    setupAdminChain({
      household: { quarter_id: "q1" },
      orgs: [{ id: "org1", name: "Bad Saeckingen" }],
      messageCount: 0,
    });

    const { POST } = await import("@/app/api/postfach/route");
    const req = makeFormDataRequest({ subject: "Guter Betreff", body: "Kurz" });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Nachricht");
  });

  it("gibt 400 wenn Buerger kein Quartier hat", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    setupAdminChain({
      household: null,
      orgs: [],
      messageCount: 0,
    });

    const { POST } = await import("@/app/api/postfach/route");
    const req = makeFormDataRequest({
      subject: "Guter Betreff",
      body: "Nachricht mit genug Zeichen",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Quartier");
  });

  it("gibt 404 wenn keine Kommune fuer das Quartier existiert", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    setupAdminChain({
      household: { quarter_id: "q-no-org" },
      orgs: [],
      messageCount: 0,
    });

    const { POST } = await import("@/app/api/postfach/route");
    const req = makeFormDataRequest({
      subject: "Guter Betreff",
      body: "Nachricht mit genug Zeichen",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("Kommune");
  });

  it("gibt 429 bei Rate-Limit-Ueberschreitung", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    setupAdminChain({
      household: { quarter_id: "q1" },
      orgs: [{ id: "org1", name: "Test Stadt" }],
      messageCount: 5,
    });

    const { POST } = await import("@/app/api/postfach/route");
    const req = makeFormDataRequest({
      subject: "Guter Betreff",
      body: "Nachricht mit genug Zeichen",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain("Tageslimit");
  });
});
