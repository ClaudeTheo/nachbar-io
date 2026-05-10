// lib/care/with-cron-heartbeat.test.ts
// Nachbar.io — Tests fuer den Cron-Wrapper (FMEA Monitoring-Vollabdeckung)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mocks fuer abhaengige Module — muessen VOR dem withCronHeartbeat-Import gesetzt sein
const upsertFn = vi.fn().mockResolvedValue({ data: null, error: null });
const adminClient = {
  from: vi.fn().mockImplementation((table: string) => {
    if (table === "cron_heartbeats") {
      return { upsert: upsertFn, select: vi.fn() };
    }
    return { upsert: vi.fn(), select: vi.fn() };
  }),
};

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => adminClient,
}));

vi.mock("@/lib/security/cron-secret", () => ({
  verifyCronSecret: vi.fn((auth: string | null, secret: string) => {
    return auth === `Bearer ${secret}`;
  }),
}));

import { withCronHeartbeat } from "./with-cron-heartbeat";

describe("withCronHeartbeat", () => {
  const VALID_AUTH = "Bearer test-secret";
  function makeRequest(headers: Record<string, string> = {}) {
    return new NextRequest("http://localhost/api/cron/x", { headers });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("500 wenn CRON_SECRET fehlt", async () => {
    delete process.env.CRON_SECRET;
    const handler = withCronHeartbeat("nina_sync", async () => ({ ok: true }));
    const res = await handler(makeRequest({ authorization: VALID_AUTH }));

    expect(res.status).toBe(500);
    expect(upsertFn).not.toHaveBeenCalled();
  });

  it("401 wenn Authorization-Header fehlt oder falsch", async () => {
    const handler = withCronHeartbeat("nina_sync", async () => ({ ok: true }));

    const res1 = await handler(makeRequest());
    expect(res1.status).toBe(401);

    const res2 = await handler(makeRequest({ authorization: "Bearer wrong" }));
    expect(res2.status).toBe(401);

    expect(upsertFn).not.toHaveBeenCalled();
  });

  it("ruft Handler auf und gibt Result als JSON-Response zurueck", async () => {
    const handlerImpl = vi.fn().mockResolvedValue({ synced: 5, errors: 0 });
    const handler = withCronHeartbeat("nina_sync", handlerImpl);

    const res = await handler(makeRequest({ authorization: VALID_AUTH }));
    const body = await res.json();

    expect(handlerImpl).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
    expect(body).toEqual({ synced: 5, errors: 0 });
  });

  it("schreibt Heartbeat mit Handler-Result als Metadata bei Erfolg", async () => {
    const handler = withCronHeartbeat("nina_sync", async () => ({
      synced: 5,
      errors: 0,
    }));

    await handler(makeRequest({ authorization: VALID_AUTH }));

    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: "nina_sync",
        metadata: { synced: 5, errors: 0 },
      }),
      { onConflict: "job_id" },
    );
  });

  it("schreibt KEINEN Heartbeat wenn Handler wirft", async () => {
    const handler = withCronHeartbeat("nina_sync", async () => {
      throw new Error("boom");
    });

    const res = await handler(makeRequest({ authorization: VALID_AUTH }));

    expect(res.status).toBe(500);
    expect(upsertFn).not.toHaveBeenCalled();
  });

  it("uebergibt supabase + request an Handler", async () => {
    const handlerImpl = vi.fn().mockResolvedValue({ ok: true });
    const handler = withCronHeartbeat("nina_sync", handlerImpl);

    const req = makeRequest({ authorization: VALID_AUTH });
    await handler(req);

    expect(handlerImpl).toHaveBeenCalledWith(adminClient, req);
  });

  it("kapselt primitive Handler-Returns in metadata.result", async () => {
    const handler = withCronHeartbeat("nina_sync", async () => 42);

    await handler(makeRequest({ authorization: VALID_AUTH }));

    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: "nina_sync",
        metadata: { result: 42 },
      }),
      { onConflict: "job_id" },
    );
  });
});
