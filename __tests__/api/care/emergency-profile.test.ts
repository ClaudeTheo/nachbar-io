// Notfallmappe-API darf gespeicherte Legacy-PDF-Tokens nicht mehr an Clients ausgeben.
import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/modules/care/services/crypto", () => ({
  decrypt: vi.fn((value: string) => value),
  encrypt: vi.fn((value: string) => value),
}));

describe("GET /api/care/emergency-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("gibt Legacy-pdf_token nicht an den Client zurueck", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: "profile-1",
              level1_encrypted: JSON.stringify({
                fullName: "Erika Beispiel",
                dateOfBirth: "1940-01-01",
              }),
              level2_encrypted: null,
              level3_encrypted: null,
              pdf_token: "legacy-cleartext-token",
              updated_at: "2026-05-04T12:00:00.000Z",
            },
            error: null,
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/care/emergency-profile/route");
    const res = await GET(new NextRequest("http://localhost/api/care/emergency-profile"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pdfToken).toBeNull();
  });
});
