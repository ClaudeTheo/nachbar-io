// __tests__/api/anonymous-bug-report.test.ts
// Tests fuer den anonymen Bug-Report Endpoint
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock-Funktionen fuer Supabase Admin-Client
const mockFrom = vi.fn();
const mockDelete = vi.fn();
const mockLt = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Security-Module mocken (Honeypot + Trap-Utils)
vi.mock("@/lib/security/traps/honeypot-field", () => ({
  checkHoneypotField: vi
    .fn()
    .mockImplementation(async (body: Record<string, unknown>) => {
      // Simuliere Honeypot: wenn body.website gesetzt, ist es ein Bot
      return Boolean(body?.website);
    }),
}));

vi.mock("@/lib/security/traps/trap-utils", () => ({
  buildClientKeysNode: vi.fn().mockReturnValue({
    ip: "192.168.1.1",
    ua: "TestBrowser/1.0",
    fp: "test-fp",
  }),
}));

// Service-Modul mocken
vi.mock("@/lib/services/misc-utilities.service", () => ({
  submitAnonymousBugReport: vi.fn().mockResolvedValue(undefined),
  computeFingerprint: vi.fn().mockReturnValue("test-fingerprint"),
  computeIpHash: vi.fn().mockReturnValue("test-ip-hash"),
}));

// Hilfsfunktion: NextRequest mit Headers erstellen
function createMockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/bug-reports/anonymous", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "192.168.1.1",
      "user-agent": "TestBrowser/1.0",
      "accept-language": "de-DE",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/bug-reports/anonymous", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("gibt success zurueck wenn Honeypot-Feld ausgefuellt ist (kein DB-Insert)", async () => {
    // Honeypot: body.website ist gesetzt → sofort success, kein Insert
    const req = createMockRequest({
      website: "http://spam.com",
      page_url: "/test",
    });

    const { POST } = await import("@/app/api/bug-reports/anonymous/route");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
