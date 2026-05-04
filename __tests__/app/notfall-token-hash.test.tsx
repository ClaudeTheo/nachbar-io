// Oeffentliche Notfallmappe sucht QR-Tokens ueber Hash, nicht ueber Klartext.
import { describe, expect, it, beforeEach, vi } from "vitest";
import { createHash } from "node:crypto";

const mockFrom = vi.fn();
const mockDecrypt = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => ({
    from: mockFrom,
  })),
}));

vi.mock("@/modules/care/services/crypto", () => ({
  decrypt: mockDecrypt,
}));

function buildQueryMock() {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: {
      level1_encrypted: "encrypted-level-1",
      pdf_token_expires_at: new Date(Date.now() + 60_000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    error: null,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  return { select, eq, maybeSingle };
}

describe("NotfallPublicPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockDecrypt.mockReturnValue(
      JSON.stringify({
        fullName: "Erika Beispiel",
        dateOfBirth: "1940-01-01",
        emergencyContact1: { name: "", phone: "", relation: "" },
        emergencyContact2: { name: "", phone: "", relation: "" },
      }),
    );
  });

  it("fragt emergency_profiles mit SHA-256-Hash des QR-Tokens ab", async () => {
    const query = buildQueryMock();
    mockFrom.mockReturnValue(query);

    const { default: NotfallPublicPage } = await import("@/app/notfall/[token]/page");
    await NotfallPublicPage({ params: Promise.resolve({ token: "qr-token-123" }) });

    const expectedHash = createHash("sha256").update("qr-token-123", "utf8").digest("hex");
    expect(query.eq).toHaveBeenCalledWith("pdf_token_hash", expectedHash);
    expect(query.eq).not.toHaveBeenCalledWith("pdf_token", "qr-token-123");
  });
});
