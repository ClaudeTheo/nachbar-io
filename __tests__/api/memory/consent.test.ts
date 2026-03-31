import { describe, it, expect, vi } from "vitest";

const mockGrantConsent = vi.fn();
const mockRevokeConsent = vi.fn();
const mockGetConsentStatus = vi.fn();

vi.mock("@/modules/memory/services/consent.service", () => ({
  grantConsent: (...args: any[]) => mockGrantConsent(...args),
  revokeConsent: (...args: any[]) => mockRevokeConsent(...args),
  getConsentStatus: (...args: any[]) => mockGetConsentStatus(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
    }),
  ),
}));

describe("Memory Consent API", () => {
  it("GET /api/memory/consent gibt Status zurueck", async () => {
    mockGetConsentStatus.mockResolvedValue([
      { consent_type: "memory_basis", granted: true },
    ]);

    const { GET } = await import("@/app/api/memory/consent/route");
    const response = await GET();
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});
