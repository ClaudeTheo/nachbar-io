import { describe, expect, it, vi } from "vitest";

const mockUser = { id: "user-123" };
const mockConsents: Record<
  string,
  { granted: boolean; granted_at: string | null; consent_version: string }
> = {
  sos: { granted: false, granted_at: null, consent_version: "1.0" },
  checkin: { granted: false, granted_at: null, consent_version: "1.0" },
  medications: { granted: false, granted_at: null, consent_version: "1.0" },
  care_profile: { granted: false, granted_at: null, consent_version: "1.0" },
  emergency_contacts: {
    granted: false,
    granted_at: null,
    consent_version: "1.0",
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: "consent-1" }, error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

vi.mock("@/lib/care/consent", () => ({
  getConsentsForUser: vi.fn().mockResolvedValue(mockConsents),
}));

vi.mock("@/lib/care/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe("GET /api/care/consent", () => {
  it("gibt 200 mit allen 5 Features zurueck", async () => {
    const { GET } = await import("@/app/api/care/consent/route");
    const request = new Request("http://localhost/api/care/consent");
    const response = await GET(
      request as unknown as import("next/server").NextRequest,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.consents).toBeDefined();
    expect(body.has_any_consent).toBe(false);
  });
});

describe("POST /api/care/consent", () => {
  it("nimmt Consent-Aenderungen an", async () => {
    const { POST } = await import("@/app/api/care/consent/route");
    const request = new Request("http://localhost/api/care/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        features: { sos: true, checkin: true },
      }),
    });
    const response = await POST(
      request as unknown as import("next/server").NextRequest,
    );
    expect(response.status).toBe(200);
  });

  it("lehnt emergency_contacts ohne sos ab", async () => {
    const { POST } = await import("@/app/api/care/consent/route");
    const request = new Request("http://localhost/api/care/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        features: { sos: false, emergency_contacts: true },
      }),
    });
    const response = await POST(
      request as unknown as import("next/server").NextRequest,
    );
    expect(response.status).toBe(400);
  });

  it("lehnt ungueltige Feature-Keys ab", async () => {
    const { POST } = await import("@/app/api/care/consent/route");
    const request = new Request("http://localhost/api/care/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        features: { invalid_feature: true },
      }),
    });
    const response = await POST(
      request as unknown as import("next/server").NextRequest,
    );
    expect(response.status).toBe(400);
  });

  it("lehnt fehlende features ab", async () => {
    const { POST } = await import("@/app/api/care/consent/route");
    const request = new Request("http://localhost/api/care/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await POST(
      request as unknown as import("next/server").NextRequest,
    );
    expect(response.status).toBe(400);
  });
});
