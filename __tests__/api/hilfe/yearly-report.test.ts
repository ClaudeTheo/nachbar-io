// __tests__/api/hilfe/yearly-report.test.ts
// Nachbar Hilfe — Tests fuer Jahresabrechnung API (PDF + CSV)

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createRouteMockSupabase } from "@/lib/care/__tests__/mock-supabase";

const mockSupabase = createRouteMockSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

// PDF/CSV-Generatoren mocken (brauchen jsPDF)
vi.mock("@/modules/hilfe/services/pdf-yearly-helper", () => ({
  generateYearlyHelperReport: vi.fn(() => new Uint8Array([1, 2, 3])),
}));

vi.mock("@/modules/hilfe/services/pdf-yearly-resident", () => ({
  generateYearlyResidentReport: vi.fn(() => new Uint8Array([1, 2, 3])),
}));

vi.mock("@/modules/hilfe/services/csv-yearly", () => ({
  generateHelperCsv: vi.fn(() => "Datum;Klient\n01.01.2026;Maria S."),
  generateResidentCsv: vi.fn(() => "Datum;Helfer\n01.01.2026;Max M."),
}));

describe("GET /api/hilfe/yearly-report", () => {
  beforeEach(() => {
    mockSupabase.reset();
    vi.clearAllMocks();
  });

  it("gibt 401 wenn nicht authentifiziert", async () => {
    const { GET } = await import("@/app/api/hilfe/yearly-report/route");
    const req = new NextRequest(
      "http://localhost/api/hilfe/yearly-report?year=2026&type=helper",
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("gibt 400 wenn year fehlt", async () => {
    mockSupabase.setUser({ id: "user-1", email: "test@test.de" });
    const { GET } = await import("@/app/api/hilfe/yearly-report/route");
    const req = new NextRequest(
      "http://localhost/api/hilfe/yearly-report?type=helper",
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("gibt 400 wenn type fehlt", async () => {
    mockSupabase.setUser({ id: "user-1", email: "test@test.de" });
    const { GET } = await import("@/app/api/hilfe/yearly-report/route");
    const req = new NextRequest(
      "http://localhost/api/hilfe/yearly-report?year=2026",
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("gibt 400 wenn type ungueltig", async () => {
    mockSupabase.setUser({ id: "user-1", email: "test@test.de" });
    const { GET } = await import("@/app/api/hilfe/yearly-report/route");
    const req = new NextRequest(
      "http://localhost/api/hilfe/yearly-report?year=2026&type=invalid",
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("gibt 400 wenn year keine 4-stellige Zahl", async () => {
    mockSupabase.setUser({ id: "user-1", email: "test@test.de" });
    const { GET } = await import("@/app/api/hilfe/yearly-report/route");
    const req = new NextRequest(
      "http://localhost/api/hilfe/yearly-report?year=abc&type=helper",
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
