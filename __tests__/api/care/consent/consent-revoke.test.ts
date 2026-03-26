// __tests__/api/care/consent/consent-revoke.test.ts
// Art. 9 DSGVO: Einwilligungswiderruf mit optionaler Datenloeschung

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockUser = { id: "user-1" };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
    from: vi.fn((table: string) => {
      if (table === "care_consents")
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "c-1", feature: "checkin", granted: false },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "c-2", granted: true },
                  error: null,
                }),
              }),
            }),
          }),
        };
      if (table === "care_consent_history")
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      if (
        table === "care_checkins" ||
        table === "care_sos_alerts" ||
        table === "care_medications" ||
        table === "care_medication_logs" ||
        table === "care_profiles"
      )
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      return { select: vi.fn(), insert: vi.fn() };
    }),
  }),
}));

vi.mock("@/lib/care/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/care/types", () => ({
  CONSENT_FEATURES: [
    "sos",
    "checkin",
    "medications",
    "care_profile",
    "emergency_contacts",
  ],
}));
vi.mock("@/lib/care/constants", () => ({ CURRENT_CONSENT_VERSION: "v1" }));

describe("POST /api/care/consent/revoke", () => {
  beforeEach(() => vi.clearAllMocks());

  it("widerruft Einwilligung erfolgreich", async () => {
    const { POST } = await import("@/app/api/care/consent/revoke/route");
    const req = new NextRequest("http://localhost/api/care/consent/revoke", {
      method: "POST",
      body: JSON.stringify({ feature: "checkin" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.revoked).toContain("checkin");
    expect(data.data_deleted).toBe(false);
  });

  it("widerruft mit Datenloeschung", async () => {
    const { POST } = await import("@/app/api/care/consent/revoke/route");
    const req = new NextRequest("http://localhost/api/care/consent/revoke", {
      method: "POST",
      body: JSON.stringify({ feature: "checkin", delete_data: true }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data_deleted).toBe(true);
  });

  it("lehnt ungueltiges Feature ab (400)", async () => {
    const { POST } = await import("@/app/api/care/consent/revoke/route");
    const req = new NextRequest("http://localhost/api/care/consent/revoke", {
      method: "POST",
      body: JSON.stringify({ feature: "hacking" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("lehnt ab ohne Feature (400)", async () => {
    const { POST } = await import("@/app/api/care/consent/revoke/route");
    const req = new NextRequest("http://localhost/api/care/consent/revoke", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("lehnt ungueltiges JSON ab (400)", async () => {
    const { POST } = await import("@/app/api/care/consent/revoke/route");
    const req = new NextRequest("http://localhost/api/care/consent/revoke", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("gibt 401 ohne Authentifizierung zurueck", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as unknown as Awaited<
      ReturnType<typeof import("@/lib/supabase/server").createClient>
    >);

    const { POST } = await import("@/app/api/care/consent/revoke/route");
    const req = new NextRequest("http://localhost/api/care/consent/revoke", {
      method: "POST",
      body: JSON.stringify({ feature: "checkin" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
