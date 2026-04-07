// Nachbar.io — Tests fuer Synthetic Smoke Check Route
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// vi.hoisted() fuer Mock-Variablen (werden VOR vi.mock aufgeloest)
const mocks = vi.hoisted(() => ({
  recordHeartbeat: vi.fn(),
  runHeartbeatEscalation: vi.fn(),
  runMedicationsCron: vi.fn(),
  runEscalationCron: vi.fn(),
  runWasteSync: vi.fn(),
  cleanupExpiredForensics: vi.fn(),
  listUsers: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => ({
    auth: { admin: { listUsers: mocks.listUsers } },
  })),
}));

vi.mock("@/lib/services/heartbeat.service", () => ({
  recordHeartbeat: mocks.recordHeartbeat,
}));

vi.mock("@/modules/care/services/heartbeat-escalation.service", () => ({
  runHeartbeatEscalation: mocks.runHeartbeatEscalation,
}));

vi.mock("@/modules/care/services/cron-medications.service", () => ({
  runMedicationsCron: mocks.runMedicationsCron,
}));

vi.mock("@/modules/care/services/cron-escalation.service", () => ({
  runEscalationCron: mocks.runEscalationCron,
}));

vi.mock("@/modules/waste", () => ({
  runWasteSync: mocks.runWasteSync,
}));

vi.mock("@/lib/security/forensic-logger", () => ({
  cleanupExpiredForensics: mocks.cleanupExpiredForensics,
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: mocks.captureMessage,
  addBreadcrumb: mocks.addBreadcrumb,
}));

import { GET } from "./route";

function createRequest(cronSecret?: string): NextRequest {
  const headers = new Headers();
  if (cronSecret) {
    headers.set("authorization", `Bearer ${cronSecret}`);
  }
  return new NextRequest("http://localhost/api/cron/synthetic-smoke", {
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-cron-secret");

  // Defaults: alles erfolgreich
  mocks.listUsers.mockResolvedValue({
    data: { users: [{ id: "user-123", email: "max.rhein@nachbar-test.de" }] },
  });
  mocks.recordHeartbeat.mockResolvedValue({ ok: true });
  mocks.runHeartbeatEscalation.mockResolvedValue({ processed: 0 });
  mocks.runMedicationsCron.mockResolvedValue({ reminded: 0, missed: 0 });
  mocks.runEscalationCron.mockResolvedValue({ processed: 0 });
  mocks.runWasteSync.mockResolvedValue({
    success: true,
    synced: 0,
    results: [],
    errors: [],
  });
  mocks.cleanupExpiredForensics.mockResolvedValue(0);
});

describe("GET /api/cron/synthetic-smoke", () => {
  it("gibt 401 zurueck ohne CRON_SECRET", async () => {
    const res = await GET(createRequest());
    expect(res.status).toBe(401);
  });

  it("gibt 401 zurueck mit falschem Secret", async () => {
    const res = await GET(createRequest("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("gibt 500 zurueck wenn CRON_SECRET nicht konfiguriert", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(createRequest("anything"));
    expect(res.status).toBe(500);
  });

  it("gibt 200 zurueck wenn alle Checks bestehen", async () => {
    const res = await GET(createRequest("test-cron-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.passed).toBe(6);
    expect(body.failed).toBe(0);
    expect(body.checks).toHaveLength(6);
    expect(body.checks[0].name).toBe("heartbeat-canary");
    expect(body.checks[0].ok).toBe(true);
    expect(mocks.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: "synthetic" }),
    );
  });

  it("markiert heartbeat-canary als warn wenn Test-User fehlt", async () => {
    mocks.listUsers.mockResolvedValue({ data: { users: [] } });

    const res = await GET(createRequest("test-cron-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.warned).toBe(1);
    expect(body.checks[0].ok).toBe("warn");
    expect(body.checks[0].reason).toContain("not found");
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("DEGRADED"),
      "warning",
    );
  });

  it("gibt 500 zurueck wenn ein Cron-Check fehlschlaegt", async () => {
    mocks.runWasteSync.mockRejectedValue(new Error("DB connection lost"));

    const res = await GET(createRequest("test-cron-secret"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.failed).toBe(1);
    const wasteCheck = body.checks.find(
      (c: { name: string }) => c.name === "cron-waste-sync",
    );
    expect(wasteCheck.ok).toBe(false);
    expect(wasteCheck.reason).toContain("DB connection lost");
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("FAILED"),
      "error",
    );
  });

  it("ruft recordHeartbeat mit source synthetic auf", async () => {
    await GET(createRequest("test-cron-secret"));

    expect(mocks.recordHeartbeat).toHaveBeenCalledWith(
      expect.anything(),
      "user-123",
      { source: "synthetic" },
    );
  });
});
