// Nachbar.io — Tests fuer das Reputationssystem
import { describe, it, expect, vi } from "vitest";
import {
  getReputationLevel,
  getProgressToNextLevel,
  getCachedReputation,
  computeReputationStats,
} from "./reputation";

// ============================================================
// getReputationLevel — Pure Funktion
// ============================================================
describe("getReputationLevel", () => {
  it("gibt Level 1 fuer 0 Punkte zurueck", () => {
    const level = getReputationLevel(0);
    expect(level.level).toBe(1);
    expect(level.name).toBe("Helfer");
  });

  it("gibt Level 2 ab 15 Punkten zurueck", () => {
    expect(getReputationLevel(15).level).toBe(2);
    expect(getReputationLevel(14).level).toBe(1);
  });

  it("gibt Level 3 ab 40 Punkten zurueck", () => {
    expect(getReputationLevel(40).level).toBe(3);
    expect(getReputationLevel(39).level).toBe(2);
  });

  it("gibt Level 4 ab 80 Punkten zurueck", () => {
    expect(getReputationLevel(80).level).toBe(4);
    expect(getReputationLevel(79).level).toBe(3);
  });

  it("gibt Level 5 ab 150 Punkten zurueck", () => {
    expect(getReputationLevel(150).level).toBe(5);
    expect(getReputationLevel(149).level).toBe(4);
  });

  it("bleibt bei Level 5 fuer sehr hohe Punktzahlen", () => {
    expect(getReputationLevel(9999).level).toBe(5);
  });

  it("gibt Level 1 fuer negative Punkte zurueck", () => {
    expect(getReputationLevel(-10).level).toBe(1);
  });
});

// ============================================================
// getProgressToNextLevel — Pure Funktion
// ============================================================
describe("getProgressToNextLevel", () => {
  it("zeigt 0% Progress bei Level-Minimum", () => {
    const result = getProgressToNextLevel(0);
    expect(result.currentLevel.level).toBe(1);
    expect(result.nextLevel?.level).toBe(2);
    expect(result.progress).toBe(0);
    expect(result.pointsToNext).toBe(15);
  });

  it("berechnet korrekten Progress innerhalb eines Levels", () => {
    const result = getProgressToNextLevel(7);
    expect(result.progress).toBeGreaterThan(40);
    expect(result.progress).toBeLessThan(55);
    expect(result.pointsToNext).toBe(8);
  });

  it("zeigt 100% und null nextLevel fuer Max-Level", () => {
    const result = getProgressToNextLevel(200);
    expect(result.currentLevel.level).toBe(5);
    expect(result.nextLevel).toBeNull();
    expect(result.progress).toBe(100);
    expect(result.pointsToNext).toBe(0);
  });

  it("zeigt exakten Grenzwert korrekt an", () => {
    const result = getProgressToNextLevel(15);
    expect(result.currentLevel.level).toBe(2);
    expect(result.progress).toBe(0);
  });
});

// ============================================================
// getCachedReputation — Pure Funktion
// ============================================================
describe("getCachedReputation", () => {
  it("gibt null fuer null settings zurueck", () => {
    expect(getCachedReputation(null)).toBeNull();
  });

  it("gibt null fuer leere settings zurueck", () => {
    expect(getCachedReputation({})).toBeNull();
  });

  it("gibt null wenn reputation fehlt", () => {
    expect(getCachedReputation({ theme: "dark" })).toBeNull();
  });

  it("gibt gecachte ReputationStats zurueck", () => {
    const mockStats = {
      points: 42,
      level: 3,
      levelName: "Aktiver Nachbar",
      alertsHelped: 5,
      helpActionsCompleted: 3,
      itemsShared: 2,
      eventsAttended: 4,
      endorsementsReceived: 1,
      reviewsReceived: 0,
      badges: ["first_aid"],
      lastComputed: "2026-03-09T12:00:00Z",
    };

    const result = getCachedReputation({ reputation: mockStats });
    expect(result).toEqual(mockStats);
  });
});

// ============================================================
// computeReputationStats — mit Supabase-Mock
// ============================================================
describe("computeReputationStats", () => {
  // Chainable + Thenable Query Builder
  function createChain(result: { count?: number | null; data?: unknown[] | null }) {
    const self = {
      select: vi.fn(() => self),
      eq: vi.fn(() => self),
      neq: vi.fn(() => self),
      in: vi.fn(() => self),
      gte: vi.fn(() => self),
      limit: vi.fn(() => self),
      single: vi.fn(() => self),
      order: vi.fn(() => self),
      // Thenable fuer Promise.all
      then: (resolve: (val: unknown) => void) => resolve(result),
    };
    return self;
  }

  function createMockSupabase(counts: Record<string, number> = {}) {
    const callIndex: Record<string, number> = {};

    return {
      from: vi.fn((table: string) => {
        callIndex[table] = (callIndex[table] ?? 0) + 1;

        // Zweiter alert_responses Aufruf = uniqueHelped Query (data statt count)
        if (table === "alert_responses" && callIndex[table] === 2) {
          return createChain({ data: [], count: null });
        }

        return createChain({ count: counts[table] ?? 0, data: null });
      }),
    };
  }

  it("berechnet Punkte korrekt aus Zaehler-Werten", async () => {
    const supabase = createMockSupabase({
      alert_responses: 5,   // 5 * 3 = 15
      help_requests: 3,     // 3 * 3 = 9
      marketplace_items: 2, // 2 * 2 = 4
      event_participants: 4, // 4 * 1 = 4
      // Summe: 32 Punkte → Level 2
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats = await computeReputationStats(supabase as any, "user-123");

    expect(stats.points).toBe(32);
    expect(stats.level).toBe(2);
    expect(stats.alertsHelped).toBe(5);
    expect(stats.helpActionsCompleted).toBe(3);
    expect(stats.itemsShared).toBe(2);
    expect(stats.eventsAttended).toBe(4);
  });

  it("vergibt first_aid Badge ab 3 Soforthilfe-Einsaetzen", async () => {
    const supabase = createMockSupabase({ alert_responses: 3 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats = await computeReputationStats(supabase as any, "user-123");
    expect(stats.badges).toContain("first_aid");
  });

  it("gibt keine Badges bei niedrigen Zaehler-Werten", async () => {
    const supabase = createMockSupabase({ alert_responses: 1 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats = await computeReputationStats(supabase as any, "user-123");
    expect(stats.badges).not.toContain("first_aid");
  });

  it("setzt lastComputed auf aktuelles Datum", async () => {
    const supabase = createMockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats = await computeReputationStats(supabase as any, "user-123");
    const computed = new Date(stats.lastComputed);
    const now = new Date();
    expect(Math.abs(now.getTime() - computed.getTime())).toBeLessThan(5000);
  });
});
