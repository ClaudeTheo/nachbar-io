// __tests__/api/cron/waste-sync.test.ts
// Integrationstests fuer den naechtlichen Waste-Sync Cron-Job

import { describe, it, expect, vi, beforeEach } from "vitest";

// Env-Vars
vi.stubEnv("CRON_SECRET", "test-cron-secret-123");

// runWasteSync Mock
const mockRunWasteSync = vi.fn();
vi.mock("@/modules/waste", () => ({
  runWasteSync: (...args: unknown[]) => mockRunWasteSync(...args),
}));

function makeRequest(headers?: Record<string, string>) {
  return new Request("http://localhost/api/cron/waste-sync", {
    headers: headers ?? {},
  });
}

describe("Cron: Waste-Sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gibt 401 ohne Authorization-Header", async () => {
    const { GET } = await import("@/app/api/cron/waste-sync/route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("gibt 401 mit falschem Secret", async () => {
    const { GET } = await import("@/app/api/cron/waste-sync/route");
    const res = await GET(
      makeRequest({ Authorization: "Bearer wrong-secret" }),
    );
    expect(res.status).toBe(401);
  });

  it("gibt 500 wenn CRON_SECRET fehlt", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const mod = await import("@/app/api/cron/waste-sync/route");
    const res = await mod.GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Konfiguration");
    vi.stubEnv("CRON_SECRET", "test-cron-secret-123");
  });

  it("gibt 200 mit Sync-Ergebnis bei Erfolg", async () => {
    mockRunWasteSync.mockResolvedValueOnce({
      synced: 2,
      results: [
        {
          source_slug: "awb-waldshut",
          status: "success",
          dates_inserted: 12,
          dates_updated: 3,
          dates_cancelled: 0,
        },
        {
          source_slug: "entsorgung-bs",
          status: "success",
          dates_inserted: 8,
          dates_updated: 0,
          dates_cancelled: 1,
        },
      ],
      errors: [],
    });

    const { GET } = await import("@/app/api/cron/waste-sync/route");
    const res = await GET(
      makeRequest({ Authorization: "Bearer test-cron-secret-123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.synced).toBe(2);
    expect(body.results).toHaveLength(2);
    expect(body.results[0].source_slug).toBe("awb-waldshut");
    expect(body.results[0].dates_inserted).toBe(12);
    expect(body.errors).toHaveLength(0);
    expect(body.timestamp).toBeDefined();
  });

  it("gibt 200 mit synced=0 wenn keine Quellen faellig", async () => {
    mockRunWasteSync.mockResolvedValueOnce({
      synced: 0,
      results: [],
      errors: [],
    });

    const { GET } = await import("@/app/api/cron/waste-sync/route");
    const res = await GET(
      makeRequest({ Authorization: "Bearer test-cron-secret-123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.synced).toBe(0);
  });

  it("gibt Fehler-Array weiter wenn einzelne Quellen scheitern", async () => {
    mockRunWasteSync.mockResolvedValueOnce({
      synced: 1,
      results: [
        {
          source_slug: "awb-waldshut",
          status: "success",
          dates_inserted: 5,
          dates_updated: 0,
          dates_cancelled: 0,
        },
      ],
      errors: ["Quelle entsorgung-bs: ICS-URL nicht erreichbar"],
    });

    const { GET } = await import("@/app/api/cron/waste-sync/route");
    const res = await GET(
      makeRequest({ Authorization: "Bearer test-cron-secret-123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toContain("entsorgung-bs");
  });

  it("gibt 500 wenn runWasteSync wirft", async () => {
    mockRunWasteSync.mockRejectedValueOnce(
      new Error("DB-Verbindung fehlgeschlagen"),
    );

    const { GET } = await import("@/app/api/cron/waste-sync/route");
    const res = await GET(
      makeRequest({ Authorization: "Bearer test-cron-secret-123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("DB-Verbindung fehlgeschlagen");
    expect(body.timestamp).toBeDefined();
  });

  it("gibt 500 mit generischem Fehler bei unbekanntem Throw", async () => {
    mockRunWasteSync.mockRejectedValueOnce("string-error");

    const { GET } = await import("@/app/api/cron/waste-sync/route");
    const res = await GET(
      makeRequest({ Authorization: "Bearer test-cron-secret-123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Unbekannter Fehler");
  });

  it("ruft runWasteSync genau einmal auf", async () => {
    mockRunWasteSync.mockResolvedValueOnce({
      synced: 0,
      results: [],
      errors: [],
    });

    const { GET } = await import("@/app/api/cron/waste-sync/route");
    await GET(makeRequest({ Authorization: "Bearer test-cron-secret-123" }));

    expect(mockRunWasteSync).toHaveBeenCalledTimes(1);
  });
});
