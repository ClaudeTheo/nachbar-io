// __tests__/lib/security/brute-force.test.ts
// Behavior-Tests fuer Brute-Force-Trap (Eskalation: 1x→10, 3x→30, 5x→50)

import { describe, it, expect, vi, beforeEach } from "vitest";

// Redis mocken — simuliert incr/expire Verhalten
const mockIncr = vi.fn();
const mockExpire = vi.fn();
vi.mock("@/lib/security/redis", () => ({
  getSecurityRedis: () => ({
    incr: mockIncr,
    expire: mockExpire,
  }),
}));

// risk-scorer + logger mocken (kein echter Redis/Supabase)
const mockRecordEvent = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/security/risk-scorer", () => ({
  recordEvent: (...args: unknown[]) => mockRecordEvent(...args),
}));

const mockLogSecurityEvent = vi.fn();
vi.mock("@/lib/security/security-logger", () => ({
  logSecurityEvent: (...args: unknown[]) => mockLogSecurityEvent(...args),
}));

import { recordAuthRateLimit } from "@/lib/security/traps/brute-force";
import type { ClientKeys } from "@/lib/security/client-key";

const mockKeys: ClientKeys = {
  ipHash: "bf_test_ip_hash",
  userId: "user-123",
  sessionHash: "sess-abc",
  deviceHash: "device-xyz",
  headerBitmap: 0x0f,
};

describe("recordAuthRateLimit (brute_force Trap)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExpire.mockResolvedValue(undefined);
  });

  it("erster Versuch: 10 Punkte, Stage 1, setzt TTL", async () => {
    mockIncr.mockResolvedValue(1);

    await recordAuthRateLimit(mockKeys);

    expect(mockIncr).toHaveBeenCalledWith("sec:bf:bf_test_ip_hash");
    expect(mockExpire).toHaveBeenCalledWith("sec:bf:bf_test_ip_hash", 600);
    expect(mockRecordEvent).toHaveBeenCalledWith(mockKeys, "brute_force", 10, ["ip"]);
    expect(mockLogSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        trapType: "brute_force",
        points: 10,
        stage: 1,
        routePattern: "/api/auth/*",
      }),
    );
  });

  it("zweiter Versuch: 10 Punkte, kein neuer TTL", async () => {
    mockIncr.mockResolvedValue(2);

    await recordAuthRateLimit(mockKeys);

    expect(mockExpire).not.toHaveBeenCalled(); // TTL nur bei count===1
    expect(mockRecordEvent).toHaveBeenCalledWith(mockKeys, "brute_force", 10, ["ip"]);
  });

  it("3 Versuche: eskaliert auf 30 Punkte, Stage 2", async () => {
    mockIncr.mockResolvedValue(3);

    await recordAuthRateLimit(mockKeys);

    expect(mockRecordEvent).toHaveBeenCalledWith(mockKeys, "brute_force", 30, ["ip"]);
    expect(mockLogSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ points: 30, stage: 2 }),
    );
  });

  it("4 Versuche: bleibt bei 30 Punkten", async () => {
    mockIncr.mockResolvedValue(4);

    await recordAuthRateLimit(mockKeys);

    expect(mockRecordEvent).toHaveBeenCalledWith(mockKeys, "brute_force", 30, ["ip"]);
  });

  it("5 Versuche: eskaliert auf 50 Punkte, Stage 3", async () => {
    mockIncr.mockResolvedValue(5);

    await recordAuthRateLimit(mockKeys);

    expect(mockRecordEvent).toHaveBeenCalledWith(mockKeys, "brute_force", 50, ["ip"]);
    expect(mockLogSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ points: 50, stage: 3 }),
    );
  });

  it("10+ Versuche: bleibt bei 50 Punkten (Maximum)", async () => {
    mockIncr.mockResolvedValue(10);

    await recordAuthRateLimit(mockKeys);

    expect(mockRecordEvent).toHaveBeenCalledWith(mockKeys, "brute_force", 50, ["ip"]);
  });

  it("Redis-Fehler: fail-open, kein Fehler geworfen", async () => {
    mockIncr.mockRejectedValue(new Error("Redis down"));

    // Darf NICHT werfen
    await expect(recordAuthRateLimit(mockKeys)).resolves.toBeUndefined();
    expect(mockRecordEvent).not.toHaveBeenCalled();
  });
});

// Redis nicht verfuegbar (null)
describe("recordAuthRateLimit ohne Redis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tut nichts wenn Redis null ist", async () => {
    // Separater Mock — ueberschreibt getSecurityRedis fuer diesen Test
    const redis = await import("@/lib/security/redis");
    vi.spyOn(redis, "getSecurityRedis").mockReturnValue(null);

    await recordAuthRateLimit(mockKeys);

    expect(mockRecordEvent).not.toHaveBeenCalled();
    expect(mockLogSecurityEvent).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
