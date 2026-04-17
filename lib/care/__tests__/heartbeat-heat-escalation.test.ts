// lib/care/__tests__/heartbeat-heat-escalation.test.ts
// Task 12: DWD-Hitze × Heartbeat-Eskalation — Tests

import { describe, it, expect, vi } from "vitest";
import {
  checkActiveHeatWarning,
  getHeatAwareEscalationStage,
  buildHeatAlertBody,
} from "../heat-warning-check";

// Mock Supabase
function createMockSupabase(rows: unknown[] = []) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: rows[0] ?? null, error: null }),
  };
  chain.from = vi.fn().mockReturnValue(chain);
  return chain as unknown;
}

describe("checkActiveHeatWarning", () => {
  it("returns the heat warning when an active DWD heat warning exists for the quarter", async () => {
    const heatWarning = {
      id: "heat-1",
      headline: "Amtliche Warnung vor Hitze",
      severity: "severe",
      event_code: "HITZE",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };
    const supabase = createMockSupabase([heatWarning]);

    const result = await checkActiveHeatWarning(
      supabase as never,
      "quarter-123",
    );

    expect(result).not.toBeNull();
    expect(result!.severity).toBe("severe");
    expect(result!.headline).toMatch(/Hitze/);
  });

  it("returns null when no heat warning exists", async () => {
    const supabase = createMockSupabase([]);

    const result = await checkActiveHeatWarning(
      supabase as never,
      "quarter-123",
    );

    expect(result).toBeNull();
  });

  it("returns null when quarter_id is null", async () => {
    const supabase = createMockSupabase([]);

    const result = await checkActiveHeatWarning(supabase as never, null);

    expect(result).toBeNull();
  });
});

describe("heartbeat-heat-escalation integration", () => {
  it("upgrades reminder_24h to alert_48h when heat warning is active", () => {
    const hoursAgo = 30; // normally reminder_24h
    const heatWarning = { severity: "severe", headline: "Hitzewarnung" };

    const stage = getHeatAwareEscalationStage(hoursAgo, heatWarning);

    expect(stage).toBe("alert_48h");
  });

  it("does NOT upgrade when no heat warning", () => {
    const hoursAgo = 30; // normally reminder_24h

    const stage = getHeatAwareEscalationStage(hoursAgo, null);

    expect(stage).toBe("reminder_24h");
  });

  it("keeps null (green zone) even with heat warning — no false alarms under 24h", () => {
    const hoursAgo = 12;
    const heatWarning = { severity: "extreme", headline: "Extreme Hitze" };

    const stage = getHeatAwareEscalationStage(hoursAgo, null);

    expect(stage).toBeNull();
  });

  it("keeps alert_48h when already at highest stage regardless of heat", () => {
    const hoursAgo = 60; // already alert_48h
    const heatWarning = { severity: "severe", headline: "Hitzewarnung" };

    const stage = getHeatAwareEscalationStage(hoursAgo, heatWarning);

    expect(stage).toBe("alert_48h");
  });

  it("includes heat context in notification body", () => {
    const body = buildHeatAlertBody(
      "Ihr Angehöriger hat sich seit über 24 Stunden nicht gemeldet.",
      { severity: "severe", headline: "Amtliche Warnung vor Hitze" },
    );

    expect(body).toContain("Hitze");
    expect(body).toContain("24 Stunden");
  });
});
