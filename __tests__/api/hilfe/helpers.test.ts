// __tests__/api/hilfe/helpers.test.ts
// Nachbar Hilfe — Tests fuer Helfer-Registrierung API

import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";
import { createRouteMockSupabase } from "@/lib/care/__tests__/mock-supabase";
import type { NextRequest } from "next/server";

const mockSupabase = createRouteMockSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

vi.mock("@/modules/hilfe/services/federal-states", () => ({
  validateHelperAge: vi.fn().mockReturnValue(true),
  isStateAvailable: vi.fn().mockReturnValue(true),
  getStateRules: vi.fn().mockReturnValue({
    state_code: "BW",
    state_name: "Baden-Wuerttemberg",
    training_required: false,
    training_hours: null,
    max_concurrent_clients: 2,
    min_age: 16,
    max_hourly_rate_cents: null,
  }),
}));

// Importiere die gemockten Funktionen fuer gezielte Ueberschreibungen
import {
  validateHelperAge,
  isStateAvailable,
  getStateRules,
} from "@/modules/hilfe/services/federal-states";

const VALID_BODY = {
  federal_state: "BW",
  date_of_birth: "1990-05-15",
  hourly_rate_cents: 1500,
  relationship_check: true,
  household_check: true,
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new Request("http://localhost/api/hilfe/helpers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/hilfe/helpers", () => {
  beforeEach(() => {
    mockSupabase.reset();
    vi.clearAllMocks();
    // Standard-Mocks zuruecksetzen
    (validateHelperAge as Mock).mockReturnValue(true);
    (isStateAvailable as Mock).mockReturnValue(true);
    (getStateRules as Mock).mockReturnValue({
      state_code: "BW",
      state_name: "Baden-Wuerttemberg",
      training_required: false,
      training_hours: null,
      max_concurrent_clients: 2,
      min_age: 16,
      max_hourly_rate_cents: null,
    });
  });

  it("gibt 401 zurueck ohne Authentifizierung", async () => {
    // Kein User gesetzt (Standard: null)
    const { POST } = await import("@/app/api/hilfe/helpers/route");
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(401);
  });

  it("erstellt Helfer mit gueltigen Daten (201)", async () => {
    mockSupabase.setUser({ id: "user-1", email: "helfer@test.de" });
    // Upsert-Response fuer neighborhood_helpers
    mockSupabase.addResponse("neighborhood_helpers", {
      data: {
        id: "helper-1",
        user_id: "user-1",
        federal_state: "BW",
        verified: false,
      },
      error: null,
    });

    const { POST } = await import("@/app/api/hilfe/helpers/route");
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.user_id).toBe("user-1");
    expect(body.federal_state).toBe("BW");
  });

  it("lehnt unter 16-Jaehrige ab (400)", async () => {
    mockSupabase.setUser({ id: "user-2", email: "jung@test.de" });
    (validateHelperAge as Mock).mockReturnValue(false);

    const { POST } = await import("@/app/api/hilfe/helpers/route");
    const response = await POST(
      makeRequest({
        ...VALID_BODY,
        date_of_birth: "2012-01-01",
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("16");
  });

  it("lehnt nicht verfuegbares Bundesland Bremen ab (400)", async () => {
    mockSupabase.setUser({ id: "user-3", email: "bremen@test.de" });
    (isStateAvailable as Mock).mockReturnValue(false);

    const { POST } = await import("@/app/api/hilfe/helpers/route");
    const response = await POST(
      makeRequest({
        ...VALID_BODY,
        federal_state: "HB",
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Bremen");
    expect(body.error).toContain("nicht");
    expect(body.error).toContain("abrechenbar");
  });

  it("lehnt fehlende Beziehungspruefung ab (400)", async () => {
    mockSupabase.setUser({ id: "user-4", email: "nocheck@test.de" });

    const { POST } = await import("@/app/api/hilfe/helpers/route");
    const response = await POST(
      makeRequest({
        ...VALID_BODY,
        relationship_check: false,
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Beziehungsprüfung");
  });

  it("lehnt fehlende Haushaltspruefung ab (400)", async () => {
    mockSupabase.setUser({ id: "user-5", email: "nohouse@test.de" });

    const { POST } = await import("@/app/api/hilfe/helpers/route");
    const response = await POST(
      makeRequest({
        ...VALID_BODY,
        household_check: false,
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Haushaltsprüfung");
  });

  it("lehnt NRW ohne Schulungsnachweis ab (400)", async () => {
    mockSupabase.setUser({ id: "user-6", email: "nrw@test.de" });
    (getStateRules as Mock).mockReturnValue({
      state_code: "NW",
      state_name: "Nordrhein-Westfalen",
      training_required: true,
      training_hours: 40,
      max_concurrent_clients: null,
      min_age: 16,
      max_hourly_rate_cents: null,
    });

    const { POST } = await import("@/app/api/hilfe/helpers/route");
    const response = await POST(
      makeRequest({
        ...VALID_BODY,
        federal_state: "NW",
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Schulungsnachweis");
  });

  it("akzeptiert NRW mit Schulungsnachweis (201)", async () => {
    mockSupabase.setUser({ id: "user-7", email: "nrw-ok@test.de" });
    (getStateRules as Mock).mockReturnValue({
      state_code: "NW",
      state_name: "Nordrhein-Westfalen",
      training_required: true,
      training_hours: 40,
      max_concurrent_clients: null,
      min_age: 16,
      max_hourly_rate_cents: null,
    });
    // Upsert-Response
    mockSupabase.addResponse("neighborhood_helpers", {
      data: {
        id: "helper-7",
        user_id: "user-7",
        federal_state: "NW",
        verified: false,
      },
      error: null,
    });

    const { POST } = await import("@/app/api/hilfe/helpers/route");
    const response = await POST(
      makeRequest({
        ...VALID_BODY,
        federal_state: "NW",
        certification_url: "https://example.com/cert.pdf",
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.federal_state).toBe("NW");
  });
});
