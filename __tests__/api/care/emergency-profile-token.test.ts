// Tests fuer Notfallmappe-PDF-Token: neue QR-Tokens duerfen nicht im Klartext gespeichert werden.
import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/care/emergency-profile/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/care/emergency-profile/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("speichert nur den SHA-256-Hash des PDF-Tokens und loescht Klartext", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "profile-1" },
      error: null,
    });
    const profileEq = vi.fn().mockReturnValue({ maybeSingle });
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });

    mockFrom.mockReturnValue({
      select: profileSelect,
      update,
    });

    const { POST } = await import("@/app/api/care/emergency-profile/token/route");
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    const expectedHash = createHash("sha256")
      .update(body.token, "utf8")
      .digest("hex");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        pdf_token: null,
        pdf_token_hash: expectedHash,
        pdf_token_expires_at: expect.any(String),
      }),
    );
    expect(update).not.toHaveBeenCalledWith(
      expect.objectContaining({ pdf_token: body.token }),
    );
  });
});
