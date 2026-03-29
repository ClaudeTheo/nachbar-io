// __tests__/api/hilfe/care-profile.test.ts
// Nachbar Hilfe — Tests fuer Pflege-Profil API (GET + POST)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createRouteMockSupabase } from "@/lib/care/__tests__/mock-supabase";

const mockSupabase = createRouteMockSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

vi.mock("@/lib/care/field-encryption", () => ({
  encryptField: vi.fn((v: string) => `enc:${v}`),
  decryptField: vi.fn((v: string) => v.replace("enc:", "")),
}));

// Route NACH den Mocks importieren
import { GET, POST } from "@/app/api/hilfe/care-profile/route";

describe("GET /api/hilfe/care-profile", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("gibt 401 ohne Authentifizierung zurueck", async () => {
    // Kein User gesetzt → auth.getUser gibt null zurueck
    const _req = new NextRequest("http://localhost/api/hilfe/care-profile");
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Nicht authentifiziert");
  });

  it("gibt Profil mit entschluesselter Versichertennummer zurueck", async () => {
    mockSupabase.setUser({ id: "user-1", email: "test@nachbar.io" });
    mockSupabase.addResponse("hilfe_care_profiles", {
      data: {
        id: "cp-1",
        user_id: "user-1",
        care_level: 3,
        insurance_name: "AOK Baden-Wuerttemberg",
        insurance_number_encrypted: "enc:A123456789",
        monthly_budget_cents: 12500,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.care_level).toBe(3);
    expect(body.insurance_name).toBe("AOK Baden-Wuerttemberg");
    // Entschluesselt: 'enc:' Praefix entfernt
    expect(body.insurance_number_encrypted).toBe("A123456789");
  });

  it("gibt 404 wenn kein Profil vorhanden", async () => {
    mockSupabase.setUser({ id: "user-2", email: "neu@nachbar.io" });
    mockSupabase.addResponse("hilfe_care_profiles", {
      data: null,
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Kein Pflege-Profil vorhanden");
  });
});

describe("POST /api/hilfe/care-profile", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("erstellt Profil mit gueltigen Daten (201)", async () => {
    mockSupabase.setUser({ id: "user-1", email: "test@nachbar.io" });
    mockSupabase.addResponse("hilfe_care_profiles", {
      data: {
        id: "cp-new",
        user_id: "user-1",
        care_level: 2,
        insurance_name: "TK",
        insurance_number_encrypted: "enc:T987654321",
        monthly_budget_cents: 12500,
        created_at: "2026-03-27T10:00:00Z",
        updated_at: "2026-03-27T10:00:00Z",
      },
      error: null,
    });

    const req = new NextRequest("http://localhost/api/hilfe/care-profile", {
      method: "POST",
      body: JSON.stringify({
        care_level: 2,
        insurance_name: "TK",
        insurance_number: "T987654321",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.care_level).toBe(2);
    expect(body.insurance_name).toBe("TK");
    expect(body.insurance_number_encrypted).toBe("T987654321");
  });

  it("lehnt ungueltige Pflegestufe ab (400)", async () => {
    mockSupabase.setUser({ id: "user-1", email: "test@nachbar.io" });

    const req = new NextRequest("http://localhost/api/hilfe/care-profile", {
      method: "POST",
      body: JSON.stringify({
        care_level: 7,
        insurance_name: "AOK",
        insurance_number: "A111",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Ungueltige Pflegestufe");
  });

  it("lehnt fehlende Pflichtfelder ab (400)", async () => {
    mockSupabase.setUser({ id: "user-1", email: "test@nachbar.io" });

    // Fehlende insurance_name und insurance_number
    const req = new NextRequest("http://localhost/api/hilfe/care-profile", {
      method: "POST",
      body: JSON.stringify({
        care_level: 3,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("insurance_name ist erforderlich");
  });
});
