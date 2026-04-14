// __tests__/api/doctors.test.ts
// Tests fuer GET /api/doctors — Arzt-Liste mit Haversine-Distanz

import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateDistance } from "@/lib/geo/haversine";

// --- Haversine Tests (reine Funktion, kein Mock noetig) ---

describe("calculateDistance (Haversine)", () => {
  it("berechnet Distanz Bad Saeckingen → Laufenburg korrekt (~8km)", () => {
    const dist = calculateDistance(47.5535, 7.964, 47.5667, 8.0614);
    expect(dist).toBeGreaterThan(6);
    expect(dist).toBeLessThan(10);
  });

  it("berechnet Distanz Bad Saeckingen → Rheinfelden korrekt (~13km)", () => {
    const dist = calculateDistance(47.5535, 7.964, 47.5543, 7.7928);
    expect(dist).toBeGreaterThan(10);
    expect(dist).toBeLessThan(16);
  });

  it("gibt 0 fuer gleiche Koordinaten", () => {
    const dist = calculateDistance(47.5535, 7.964, 47.5535, 7.964);
    expect(dist).toBe(0);
  });

  it("filtert Aerzte ausserhalb 20km", () => {
    // Freiburg ist ~65km von Bad Saeckingen entfernt
    const dist = calculateDistance(47.5535, 7.964, 47.999, 7.842);
    expect(dist).toBeGreaterThan(20);
  });
});

// --- API-Route Tests (mit Mocks) ---

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

let mockQueryResult: { data: unknown; error: unknown };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      from: vi.fn(() => {
        const chain: Record<string, unknown> = {};
        const terminalResult = Promise.resolve(mockQueryResult);

        chain.select = vi.fn().mockReturnValue(chain);
        chain.eq = vi.fn().mockReturnValue(chain);
        chain.not = vi.fn().mockReturnValue(chain);
        chain.in = vi.fn().mockReturnValue(chain);
        chain.contains = vi.fn().mockReturnValue(chain);
        chain.order = vi.fn().mockReturnValue(chain);
        chain.then = terminalResult.then.bind(terminalResult);

        return chain;
      }),
    }),
  ),
}));

function makeNextRequest(url: string) {
  const parsed = new URL(url);
  return { nextUrl: parsed, url, headers: new Headers() };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = { data: [], error: null };
});

describe("GET /api/doctors", () => {
  it("gibt Aerzte mit Distanz zurueck", async () => {
    mockQueryResult = {
      data: [
        {
          id: "d-1",
          user_id: "u-1",
          specialization: ["Allgemeinmedizin"],
          visible: true,
          latitude: 47.5535,
          longitude: 7.964,
          user: { display_name: "Dr. Test", avatar_url: null },
        },
      ],
      error: null,
    };

    const { GET } = await import("@/app/api/doctors/route");
    const response = await GET(
      makeNextRequest("http://localhost/api/doctors") as never,
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json[0].distance_km).toBeDefined();
    expect(json[0].specialization).toContain("Allgemeinmedizin");
  });

  it("gibt leere Liste zurueck wenn keine Aerzte vorhanden", async () => {
    mockQueryResult = { data: [], error: null };

    const { GET } = await import("@/app/api/doctors/route");
    const response = await GET(
      makeNextRequest("http://localhost/api/doctors") as never,
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual([]);
  });

  it("gibt 500 bei Datenbankfehler", async () => {
    mockQueryResult = { data: null, error: { message: "Query failed" } };

    const { GET } = await import("@/app/api/doctors/route");
    const response = await GET(
      makeNextRequest("http://localhost/api/doctors") as never,
    );

    expect(response.status).toBe(500);
  });

  it("filtert Aerzte ausserhalb 20km Radius", async () => {
    mockQueryResult = {
      data: [
        {
          id: "d-near",
          latitude: 47.5535,
          longitude: 7.964,
          user: { display_name: "Nah" },
        },
        {
          id: "d-far",
          latitude: 48.5,
          longitude: 9.0,
          user: { display_name: "Weit" },
        },
      ],
      error: null,
    };

    const { GET } = await import("@/app/api/doctors/route");
    const response = await GET(
      makeNextRequest("http://localhost/api/doctors") as never,
    );
    const json = await response.json();

    // Nur der nahe Arzt sollte zurueckgegeben werden
    expect(json.length).toBe(1);
    expect(json[0].id).toBe("d-near");
  });

  it("sortiert nach Distanz aufsteigend", async () => {
    mockQueryResult = {
      data: [
        {
          id: "d-far",
          latitude: 47.5667,
          longitude: 8.0614,
          user: { display_name: "Weiter" },
        },
        {
          id: "d-near",
          latitude: 47.5535,
          longitude: 7.964,
          user: { display_name: "Naeher" },
        },
      ],
      error: null,
    };

    const { GET } = await import("@/app/api/doctors/route");
    const response = await GET(
      makeNextRequest("http://localhost/api/doctors") as never,
    );
    const json = await response.json();

    expect(json[0].id).toBe("d-near");
    expect(json[1].id).toBe("d-far");
  });
});
