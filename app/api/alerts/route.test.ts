// app/api/alerts/route.test.ts
// Nachbar.io — Adress-/Standort-Minimierung der Alert-Liste (Security H3 / DSGVO W5)
// Verifiziert: GET liefert KEINE Haushalts-Adresse und KEINE exakten Koordinaten
// an nicht-privilegierte Abrufer. Rollen-/Helfer-Logik wie /api/alerts/[id]/location.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createRouteMockSupabase } from "@/lib/care/__tests__/mock-supabase";

const mockSupabase = createRouteMockSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

import { GET, POST } from "./route";

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const TEST_USER = { id: "user-free-1", email: "free@test.de" };

// Alert mit exakter GPS + verknüpftem Haushalt (so wie die DB ihn heute liefert)
function alertWithAddress() {
  return {
    id: "alert-1",
    user_id: "author-1",
    category: "package",
    title: "Paket angenommen",
    status: "open",
    location_lat: 47.553512,
    location_lng: 7.964023,
    location_source: "gps",
    household: {
      street_name: "Purkersdorfer Straße",
      house_number: "35",
      lat: 47.553512,
      lng: 7.964023,
    },
    user: { display_name: "Anna", avatar_url: null },
    responses: [],
  };
}

describe("GET /api/alerts — Adress- und Standort-Minimierung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.reset();
    mockSupabase.setUser(TEST_USER);
  });

  it("gibt 401 zurück ohne authentifizierten User", async () => {
    mockSupabase.setUser(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("liefert einem Free-Nutzer KEINE exakten Koordinaten und KEINE Haushalts-Adresse", async () => {
    mockSupabase.addResponse("alerts", {
      data: [alertWithAddress()],
      error: null,
    });
    // org_members / doctor_profiles / alert_responses → default null (Free-Tier)

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveLength(1);
    // Keine exakte GPS für Free
    expect(body[0].location_lat).toBeNull();
    expect(body[0].location_lng).toBeNull();
    // Keine Haushalts-Adresse durchgereicht
    expect(body[0].household).toBeUndefined();
  });

  it("fragt die Haushalts-Adresse gar nicht erst aus der DB ab (Datenminimierung im Select)", async () => {
    mockSupabase.addResponse("alerts", {
      data: [alertWithAddress()],
      error: null,
    });

    await GET();

    const alertsCall = mockSupabase.fromCalls.find((c) => c.table === "alerts");
    expect(alertsCall).toBeTruthy();
    const selectArg = alertsCall!.args.find((a) => a[0] === "select")?.[1] as
      | string
      | undefined;
    expect(selectArg).toBeTruthy();
    expect(selectArg!.toLowerCase()).not.toContain("households");
  });

  it("liefert einem bestätigten Helfer (Pro-Org mit Antwort) die exakten Koordinaten", async () => {
    mockSupabase.addResponse("alerts", {
      data: [alertWithAddress()],
      error: null,
    });
    // Abrufer ist Org-Mitglied → Pro-Tier
    mockSupabase.addResponse("org_members", {
      data: { id: "org-1" },
      error: null,
    });
    // Abrufer hat auf den Alert geantwortet → bestätigter Helfer
    mockSupabase.addResponse("alert_responses", {
      data: [{ alert_id: "alert-1" }],
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body[0].location_lat).toBe(47.553512);
    expect(body[0].location_lng).toBe(7.964023);
  });

  it("liefert einem Pro-Abrufer OHNE Antwort nur gerundete Koordinaten", async () => {
    mockSupabase.addResponse("alerts", {
      data: [alertWithAddress()],
      error: null,
    });
    mockSupabase.addResponse("org_members", {
      data: { id: "org-1" },
      error: null,
    });
    // keine alert_responses → kein bestätigter Helfer → gerundet

    const res = await GET();
    const body = await res.json();

    // roundCoordinates(47.553512) -> 47.554 ; (7.964023) -> 7.964
    expect(body[0].location_lat).toBe(47.554);
    expect(body[0].location_lng).toBe(7.964);
    expect(body[0].location_lat).not.toBe(47.553512);
  });
});

// POST-Validierung (konsolidiert aus dem frueheren __tests__/api/alerts.test.ts)
describe("POST /api/alerts — Validierung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.reset();
    mockSupabase.setUser(TEST_USER);
  });

  it("gibt 401 zurück ohne authentifizierten User", async () => {
    mockSupabase.setUser(null);
    const res = await POST(createPostRequest({ category: "noise", title: "Test Alert" }));
    expect(res.status).toBe(401);
  });

  it("gibt 400 bei ungültiger Kategorie zurück", async () => {
    const res = await POST(createPostRequest({ category: "invalid", title: "Test Alert" }));
    expect(res.status).toBe(400);
  });

  it("gibt 400 bei zu kurzem Titel zurück", async () => {
    const res = await POST(createPostRequest({ category: "noise", title: "AB" }));
    expect(res.status).toBe(400);
  });
});
