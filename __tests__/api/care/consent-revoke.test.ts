import { describe, expect, it, vi } from "vitest";

const mockUser = { id: "user-123" };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
    },
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: { id: "consent-1" }, error: null }),
            }),
          }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }),
}));

vi.mock("@/lib/care/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe("POST /api/care/consent/revoke", () => {
  it("widerruft ein Feature ohne Datenloeschung", async () => {
    const { POST } = await import("@/app/api/care/consent/revoke/route");
    const request = new Request("http://localhost/api/care/consent/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature: "medications", delete_data: false }),
    });
    const response = await POST(
      request as unknown as import("next/server").NextRequest,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.revoked).toContain("medications");
    expect(body.data_deleted).toBe(false);
  });

  it("widerruft ein Feature mit Datenloeschung", async () => {
    const { POST } = await import("@/app/api/care/consent/revoke/route");
    const request = new Request("http://localhost/api/care/consent/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature: "medications", delete_data: true }),
    });
    const response = await POST(
      request as unknown as import("next/server").NextRequest,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data_deleted).toBe(true);
  });

  it("lehnt ungueltige Features ab", async () => {
    const { POST } = await import("@/app/api/care/consent/revoke/route");
    const request = new Request("http://localhost/api/care/consent/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature: "invalid" }),
    });
    const response = await POST(
      request as unknown as import("next/server").NextRequest,
    );
    expect(response.status).toBe(400);
  });

  it("lehnt fehlenden Body ab", async () => {
    const { POST } = await import("@/app/api/care/consent/revoke/route");
    const request = new Request("http://localhost/api/care/consent/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const response = await POST(
      request as unknown as import("next/server").NextRequest,
    );
    expect(response.status).toBe(400);
  });
});
