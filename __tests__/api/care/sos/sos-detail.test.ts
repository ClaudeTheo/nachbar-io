// __tests__/api/care/sos/sos-detail.test.ts
// Sicherheitskritisch: SOS-Detail abfragen und Status aendern

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockUser = { id: "user-1" };
const mockAlert = {
  id: "sos-1",
  senior_id: "user-1",
  status: "triggered",
  category: "medical_emergency",
  notes: "Hilfe benoetigt",
  current_escalation_level: 1,
  responses: [
    {
      id: "r-1",
      helper_id: "h-1",
      response_type: "accepted",
      note: "Bin unterwegs",
      helper: { display_name: "Max", avatar_url: null },
    },
  ],
  senior: { display_name: "Frau Mueller", avatar_url: null },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
    from: vi.fn((table: string) => {
      if (table === "care_sos_alerts")
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: mockAlert, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    ...mockAlert,
                    status: "resolved",
                    resolved_by: "user-1",
                    resolved_at: "2026-03-22T10:00:00Z",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      return { select: vi.fn() };
    }),
  }),
}));

vi.mock("@/lib/care/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/care/api-helpers", () => ({
  requireCareAccess: vi.fn().mockResolvedValue("helper"),
}));
vi.mock("@/lib/care/field-encryption", () => ({
  encryptField: vi.fn((v: string) => v),
  decryptFields: vi.fn((obj: Record<string, unknown>) => obj),
  CARE_SOS_ALERTS_ENCRYPTED_FIELDS: ["notes"],
  CARE_SOS_RESPONSES_ENCRYPTED_FIELDS: ["note"],
}));

describe("GET /api/care/sos/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gibt einzelnen SOS-Alert mit Antworten zurueck (200)", async () => {
    const { GET } = await import("@/app/api/care/sos/[id]/route");
    const req = new NextRequest("http://localhost/api/care/sos/sos-1");
    const res = await GET(req, { params: Promise.resolve({ id: "sos-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("sos-1");
    expect(data.category).toBe("medical_emergency");
    expect(data.responses).toHaveLength(1);
  });

  it("gibt 401 ohne Authentifizierung zurueck", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as unknown as Awaited<
      ReturnType<typeof import("@/lib/supabase/server").createClient>
    >);

    const { GET } = await import("@/app/api/care/sos/[id]/route");
    const req = new NextRequest("http://localhost/api/care/sos/sos-1");
    const res = await GET(req, { params: Promise.resolve({ id: "sos-1" }) });
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/care/sos/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loest SOS-Alert auf (resolved)", async () => {
    const { PATCH } = await import("@/app/api/care/sos/[id]/route");
    const req = new NextRequest("http://localhost/api/care/sos/sos-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "resolved", notes: "Alles gut" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "sos-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("resolved");
  });

  it("lehnt ungueltigen Status ab (400)", async () => {
    const { PATCH } = await import("@/app/api/care/sos/[id]/route");
    const req = new NextRequest("http://localhost/api/care/sos/sos-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "hacked" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "sos-1" }) });
    expect(res.status).toBe(400);
  });

  it("lehnt ab ohne Status-Feld (400)", async () => {
    const { PATCH } = await import("@/app/api/care/sos/[id]/route");
    const req = new NextRequest("http://localhost/api/care/sos/sos-1", {
      method: "PATCH",
      body: JSON.stringify({}),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "sos-1" }) });
    expect(res.status).toBe(400);
  });

  it("lehnt ungueltiges JSON ab (400)", async () => {
    const { PATCH } = await import("@/app/api/care/sos/[id]/route");
    const req = new NextRequest("http://localhost/api/care/sos/sos-1", {
      method: "PATCH",
      body: "not json",
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "sos-1" }) });
    expect(res.status).toBe(400);
  });

  it("erlaubt cancelled als Status", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn((table: string) => {
        if (table === "care_sos_alerts")
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({
                    data: { senior_id: "user-1" },
                    error: null,
                  }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      ...mockAlert,
                      status: "cancelled",
                      senior_id: "user-1",
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        return { select: vi.fn() };
      }),
    } as unknown as Awaited<
      ReturnType<typeof import("@/lib/supabase/server").createClient>
    >);

    const { PATCH } = await import("@/app/api/care/sos/[id]/route");
    const req = new NextRequest("http://localhost/api/care/sos/sos-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelled" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "sos-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("cancelled");
  });

  it("gibt 401 ohne Authentifizierung zurueck", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as unknown as Awaited<
      ReturnType<typeof import("@/lib/supabase/server").createClient>
    >);

    const { PATCH } = await import("@/app/api/care/sos/[id]/route");
    const req = new NextRequest("http://localhost/api/care/sos/sos-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "resolved" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "sos-1" }) });
    expect(res.status).toBe(401);
  });
});
