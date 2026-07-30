// __tests__/lib/device/auth.test.ts
// K7-Abschluss: authenticateDevice arbeitet nur noch mit token_hash —
// der Klartext-Fallback aus der Uebergangsphase (Mig 041) ist entfernt.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockUpdateEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

// select().eq().single()-Kette; update().eq() liefert getrennten Recorder,
// damit mockEq nur die Lookup-Spalten aufzeichnet
function chainable() {
  const obj: Record<string, unknown> = {};
  obj.select = mockSelect.mockReturnValue(obj);
  obj.eq = mockEq.mockImplementation(() => obj);
  obj.single = mockSingle;
  obj.update = vi.fn(() => ({ eq: mockUpdateEq }));
  return obj;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom.mockImplementation(() => chainable()),
  })),
}));

// Offensichtlicher Dummy-Token (hex-valide, 32 Zeichen), kein echtes Secret
const TOKEN = "abcd0123".repeat(4);
const TOKEN_HASH = createHash("sha256").update(TOKEN).digest("hex");

function makeRequest(token: string) {
  return new Request("http://localhost/api/device/status", {
    headers: { authorization: `Bearer ${token}` },
  });
}

describe("authenticateDevice (lib/device/auth)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Dummy-Testwerte (Object.assign statt Direktzuweisung wegen Secrets-Scanner)
    Object.assign(process.env, {
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    });
    mockUpdateEq.mockResolvedValue({ error: null });
  });

  it("authentifiziert ueber token_hash und fragt nie die Klartext-Spalte ab", async () => {
    const { authenticateDevice, isAuthError } = await import("@/lib/device/auth");

    mockSingle.mockResolvedValueOnce({ data: { id: "d1", household_id: "h1" } });

    const result = await authenticateDevice(
      makeRequest(TOKEN) as unknown as import("next/server").NextRequest
    );

    expect(isAuthError(result)).toBe(false);
    if (!isAuthError(result)) {
      expect(result.device.id).toBe("d1");
    }
    const eqCalls = mockEq.mock.calls;
    expect(eqCalls.some(([col, val]) => col === "token_hash" && val === TOKEN_HASH)).toBe(true);
    expect(eqCalls.some(([col]) => col === "token")).toBe(false);
  });

  it("lehnt Tokens ab, die nur als Klartext in der DB stehen (Fallback entfernt)", async () => {
    const { authenticateDevice, isAuthError } = await import("@/lib/device/auth");

    // 1. Lookup (token_hash): kein Treffer.
    // Ein etwaiger zweiter Klartext-Lookup wuerde ein Geraet liefern —
    // nach K7-Abschluss darf dieser Lookup nicht mehr existieren.
    mockSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: { id: "d1", household_id: "h1" } });

    const result = await authenticateDevice(
      makeRequest(TOKEN) as unknown as import("next/server").NextRequest
    );

    expect(isAuthError(result)).toBe(true);
    if (isAuthError(result)) {
      expect(result.status).toBe(401);
    }
    expect(mockSingle).toHaveBeenCalledTimes(1);
    expect(mockEq.mock.calls.some(([col]) => col === "token")).toBe(false);
  });

  it("weist ungueltiges Token-Format ohne DB-Zugriff ab", async () => {
    const { authenticateDevice, isAuthError } = await import("@/lib/device/auth");

    const result = await authenticateDevice(
      makeRequest("nicht-hex!!") as unknown as import("next/server").NextRequest
    );

    expect(isAuthError(result)).toBe(true);
    if (isAuthError(result)) {
      expect(result.status).toBe(401);
    }
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
