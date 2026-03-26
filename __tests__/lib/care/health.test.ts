// __tests__/lib/care/health.test.ts
// Care-Modul Gesundheitspruefungen

import { describe, it, expect, vi, beforeEach } from "vitest";

function createMockSupabase(
  overrides: {
    profileError?: boolean;
    sosCount?: number;
    lastCheckinMinutes?: number | null;
    auditCount?: number;
    subscriptionError?: boolean;
  } = {},
) {
  const {
    profileError,
    sosCount = 0,
    lastCheckinMinutes,
    auditCount = 10,
    subscriptionError,
  } = overrides;

  return {
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.in = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);

      if (table === "care_profiles") {
        if (profileError) {
          chain.then = (_: unknown, reject: (e: Error) => void) => {
            reject(new Error("DB down"));
          };
        } else {
          chain.then = (resolve: (v: { count: number; error: null }) => void) =>
            resolve({ count: 5, error: null });
        }
      } else if (table === "care_sos_alerts") {
        chain.then = (resolve: (v: { count: number; error: null }) => void) =>
          resolve({ count: sosCount, error: null });
      } else if (table === "care_checkins") {
        const checkinData =
          lastCheckinMinutes !== null && lastCheckinMinutes !== undefined
            ? {
                created_at: new Date(
                  Date.now() - lastCheckinMinutes * 60000,
                ).toISOString(),
              }
            : null;
        chain.maybeSingle = vi
          .fn()
          .mockResolvedValue({ data: checkinData, error: null });
      } else if (table === "care_audit_log") {
        chain.then = (resolve: (v: { count: number; error: null }) => void) =>
          resolve({ count: auditCount, error: null });
      } else if (table === "care_subscriptions") {
        if (subscriptionError) {
          chain.then = (
            resolve: (v: { count: null; error: { message: string } }) => void,
          ) => resolve({ count: null, error: { message: "Tabelle fehlt" } });
        } else {
          chain.then = (resolve: (v: { count: number; error: null }) => void) =>
            resolve({ count: 3, error: null });
        }
      }

      return chain;
    }),
  };
}

describe("runCareHealthChecks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gibt 5 Checks zurueck bei gesundem System", async () => {
    const { runCareHealthChecks } = await import("@/lib/care/health");
    const supabase = createMockSupabase({ lastCheckinMinutes: 5 });
    const checks = await runCareHealthChecks(
      supabase as unknown as Parameters<typeof runCareHealthChecks>[0],
    );
    expect(checks).toHaveLength(5);
    expect(checks.every((c) => c.status === "ok")).toBe(true);
  });

  it("gibt warn bei aktiven SOS-Alarmen zurueck", async () => {
    const { runCareHealthChecks } = await import("@/lib/care/health");
    const supabase = createMockSupabase({ sosCount: 3, lastCheckinMinutes: 5 });
    const checks = await runCareHealthChecks(
      supabase as unknown as Parameters<typeof runCareHealthChecks>[0],
    );
    const sosCheck = checks.find((c) => c.name === "SOS-Alarme");
    expect(sosCheck?.status).toBe("warn");
    expect(sosCheck?.detail).toContain("3");
  });

  it("gibt warn bei altem Check-in zurueck", async () => {
    const { runCareHealthChecks } = await import("@/lib/care/health");
    const supabase = createMockSupabase({ lastCheckinMinutes: 60 });
    const checks = await runCareHealthChecks(
      supabase as unknown as Parameters<typeof runCareHealthChecks>[0],
    );
    const checkinCheck = checks.find((c) => c.name === "Check-in Cron");
    expect(checkinCheck?.status).toBe("warn");
  });

  it("gibt warn bei fehlenden Check-ins zurueck", async () => {
    const { runCareHealthChecks } = await import("@/lib/care/health");
    const supabase = createMockSupabase({ lastCheckinMinutes: null });
    const checks = await runCareHealthChecks(
      supabase as unknown as Parameters<typeof runCareHealthChecks>[0],
    );
    const checkinCheck = checks.find((c) => c.name === "Check-in Cron");
    expect(checkinCheck?.status).toBe("warn");
    expect(checkinCheck?.detail).toContain("Keine");
  });

  it("gibt ok bei frischem Check-in zurueck", async () => {
    const { runCareHealthChecks } = await import("@/lib/care/health");
    const supabase = createMockSupabase({ lastCheckinMinutes: 10 });
    const checks = await runCareHealthChecks(
      supabase as unknown as Parameters<typeof runCareHealthChecks>[0],
    );
    const checkinCheck = checks.find((c) => c.name === "Check-in Cron");
    expect(checkinCheck?.status).toBe("ok");
  });
});
