// __tests__/api/resident/resident-status.test.ts
// Tests fuer Resident-Status API (Caregiver prueft Bewohner-Status)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

let mockUser: { id: string; email: string } | null;

function createStatusMock(
  callResults: Array<{ data: unknown; error: unknown }>,
) {
  let callIndex = 0;

  return {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: mockUser }, error: null }),
    },
    from: vi.fn().mockImplementation(() => {
      const response = callResults[callIndex] ?? { data: null, error: null };
      callIndex++;

      const chain: Record<string, unknown> = {};
      const terminalResult = Promise.resolve(response);

      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.is = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn().mockReturnValue(terminalResult);
      chain.maybeSingle = vi.fn().mockReturnValue(terminalResult);
      chain.then = terminalResult.then.bind(terminalResult);

      return chain;
    }),
  };
}

let mockSupabase: ReturnType<typeof createStatusMock>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn().mockImplementation(() => mockSupabase),
}));

// --- Tests ---

describe("GET /api/resident/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockUser = { id: "caregiver-1", email: "tochter@test.de" };
  });

  it("gibt ok-Status bei kuerzlichem Heartbeat zurueck", async () => {
    const recentHeartbeat = new Date(Date.now() - 2 * 3600000).toISOString(); // vor 2h

    mockSupabase = createStatusMock([
      // 1. caregiver_links: aktiver Link mit heartbeat_visible=true
      { data: { id: "link-1", heartbeat_visible: true }, error: null },
      // 2. users: Name des Bewohners
      { data: { display_name: "Gertrude H." }, error: null },
      // 2. heartbeats: letzter Heartbeat vor 2h
      { data: { created_at: recentHeartbeat }, error: null },
      // 3. care_checkins: letztes Check-in
      { data: { status: "ok", created_at: recentHeartbeat }, error: null },
    ]);

    const { GET } = await import("@/app/api/resident/status/route");
    const request = new NextRequest(
      "http://localhost/api/resident/status?resident_id=senior-1",
    );
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.display_name).toBe("Gertrude H.");
    expect(json.heartbeat_visible).toBe(true);
    expect(json.last_heartbeat).toBeDefined();
    expect(json.last_checkin_status).toBe("ok");
    expect(json.last_checkin).toBeDefined();
  });

  // Phase-1 F-1: 2-Stufen-Modell (HEARTBEAT_ESCALATION)
  //   <=24h -> ok, 24-48h -> warning (reminder_24h), >48h -> missing (alert_48h)
  // "critical" existiert nicht mehr — der alte 25h/critical-Test wurde
  // entfernt, weil der Status-Wert im 2-Stufen-Modell keine Entsprechung hat.

  it("gibt warning-Status bei 30h altem Heartbeat zurueck (24-48h Fenster)", async () => {
    const reminderWindow = new Date(Date.now() - 30 * 3600000).toISOString(); // vor 30h -> zwischen 24h und 48h

    mockSupabase = createStatusMock([
      { data: { id: "link-1", heartbeat_visible: true }, error: null },
      { data: { display_name: "Gertrude H." }, error: null },
      { data: { created_at: reminderWindow }, error: null },
      { data: null, error: null },
    ]);

    const { GET } = await import("@/app/api/resident/status/route");
    const request = new NextRequest(
      "http://localhost/api/resident/status?resident_id=senior-1",
    );
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("warning");
  });

  it("gibt missing-Status bei 50h altem Heartbeat zurueck (>48h)", async () => {
    const alertWindow = new Date(Date.now() - 50 * 3600000).toISOString(); // vor 50h

    mockSupabase = createStatusMock([
      { data: { id: "link-1", heartbeat_visible: true }, error: null },
      { data: { display_name: "Gertrude H." }, error: null },
      { data: { created_at: alertWindow }, error: null },
      { data: null, error: null },
    ]);

    const { GET } = await import("@/app/api/resident/status/route");
    const request = new NextRequest(
      "http://localhost/api/resident/status?resident_id=senior-1",
    );
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("missing");
  });

  it("gibt ok zurueck wenn heartbeat_visible=false (kein Heartbeat-Zugriff)", async () => {
    mockSupabase = createStatusMock([
      // Link existiert aber heartbeat_visible=false
      { data: { id: "link-1", heartbeat_visible: false }, error: null },
      { data: { display_name: "Gertrude H." }, error: null },
      // care_checkins
      { data: null, error: null },
    ]);

    const { GET } = await import("@/app/api/resident/status/route");
    const request = new NextRequest(
      "http://localhost/api/resident/status?resident_id=senior-1",
    );
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.display_name).toBe("Gertrude H.");
    expect(json.last_heartbeat).toBeNull();
    expect(json.heartbeat_visible).toBe(false);
  });

  it("gibt 403 ohne aktiven Caregiver-Link", async () => {
    mockSupabase = createStatusMock([
      // Kein Link gefunden
      { data: null, error: { code: "PGRST116", message: "Not found" } },
    ]);

    const { GET } = await import("@/app/api/resident/status/route");
    const request = new NextRequest(
      "http://localhost/api/resident/status?resident_id=senior-1",
    );
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toContain("Verknüpfung");
  });

  it("gibt 400 ohne resident_id Parameter", async () => {
    mockSupabase = createStatusMock([]);

    const { GET } = await import("@/app/api/resident/status/route");
    const request = new NextRequest("http://localhost/api/resident/status");
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain("resident_id");
  });

  it("gibt 401 ohne Authentifizierung", async () => {
    mockUser = null;
    mockSupabase = createStatusMock([]);

    const { GET } = await import("@/app/api/resident/status/route");
    const request = new NextRequest(
      "http://localhost/api/resident/status?resident_id=senior-1",
    );
    const response = await GET(request as never);

    expect(response.status).toBe(401);
  });
});
