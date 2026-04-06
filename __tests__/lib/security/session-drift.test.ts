// __tests__/lib/security/session-drift.test.ts
// Behavior-Tests fuer Session-Drift-Erkennung (gleiche Session, wechselnder Device-Hash)

import { describe, it, expect, vi, beforeEach } from "vitest";

// Redis Pipeline mocken
const mockZadd = vi.fn();
const mockExpire = vi.fn();
const mockZremrangebyscore = vi.fn();
const mockZrange = vi.fn();
const mockExec = vi.fn();

const mockPipeline = {
  zadd: (...args: unknown[]) => { mockZadd(...args); return mockPipeline; },
  expire: (...args: unknown[]) => { mockExpire(...args); return mockPipeline; },
  zremrangebyscore: (...args: unknown[]) => { mockZremrangebyscore(...args); return mockPipeline; },
  zrange: (...args: unknown[]) => { mockZrange(...args); return mockPipeline; },
  exec: () => mockExec(),
};

vi.mock("@/lib/security/redis", () => ({
  getSecurityRedis: () => ({
    pipeline: () => mockPipeline,
  }),
  reportRedisFailure: vi.fn(),
}));

import {
  sessionDriftPoints,
  checkSessionDeviceDrift,
} from "@/lib/security/risk-scorer";
import type { ClientKeys } from "@/lib/security/client-key";

const mockKeys: ClientKeys = {
  ipHash: "drift_test_ip",
  userId: null,
  sessionHash: "sess-drift-abc",
  deviceHash: "device-drift-001",
  headerBitmap: 0xff,
};

describe("sessionDriftPoints (Pure Function)", () => {
  it("1 Hash (kein Wechsel) → 0 Punkte", () => {
    expect(sessionDriftPoints(1)).toBe(0);
  });

  it("2 Hashes → 10 Punkte", () => {
    expect(sessionDriftPoints(2)).toBe(10);
  });

  it("3 Hashes → 25 Punkte", () => {
    expect(sessionDriftPoints(3)).toBe(25);
  });

  it("4 Hashes → 40 Punkte (Maximum)", () => {
    expect(sessionDriftPoints(4)).toBe(40);
  });

  it("10 Hashes → 40 Punkte (cap bei 4+)", () => {
    expect(sessionDriftPoints(10)).toBe(40);
  });

  it("0 Hashes → 0 Punkte", () => {
    expect(sessionDriftPoints(0)).toBe(0);
  });
});

describe("checkSessionDeviceDrift (Redis-Integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keine Drift bei nur 1 Device-Hash", async () => {
    // Redis gibt 1 Member zurueck (gleicher Device-Hash)
    mockExec.mockResolvedValue([
      1,    // zadd
      true, // expire
      0,    // zremrangebyscore
      ["device-drift-001:1712345678000"], // zrange — 1 eindeutiger Hash
    ]);

    const result = await checkSessionDeviceDrift(mockKeys);

    expect(result.uniqueHashes).toBe(1);
    expect(result.points).toBe(0);
  });

  it("erkennt 2 verschiedene Device-Hashes (10 Punkte)", async () => {
    mockExec.mockResolvedValue([
      1, true, 0,
      [
        "device-drift-001:1712345678000",
        "device-drift-002:1712345679000",
      ],
    ]);

    const result = await checkSessionDeviceDrift(mockKeys);

    expect(result.uniqueHashes).toBe(2);
    expect(result.points).toBe(10);
  });

  it("erkennt 3 verschiedene Device-Hashes (25 Punkte)", async () => {
    mockExec.mockResolvedValue([
      1, true, 0,
      [
        "device-drift-001:1712345678000",
        "device-drift-002:1712345679000",
        "device-drift-003:1712345680000",
      ],
    ]);

    const result = await checkSessionDeviceDrift(mockKeys);

    expect(result.uniqueHashes).toBe(3);
    expect(result.points).toBe(25);
  });

  it("erkennt 4+ verschiedene Device-Hashes (40 Punkte Maximum)", async () => {
    mockExec.mockResolvedValue([
      1, true, 0,
      [
        "device-aaa:1712345678000",
        "device-bbb:1712345679000",
        "device-ccc:1712345680000",
        "device-ddd:1712345681000",
        "device-eee:1712345682000",
      ],
    ]);

    const result = await checkSessionDeviceDrift(mockKeys);

    expect(result.uniqueHashes).toBe(5);
    expect(result.points).toBe(40);
  });

  it("zaehlt doppelte Device-Hashes nur einmal", async () => {
    mockExec.mockResolvedValue([
      1, true, 0,
      [
        "device-drift-001:1712345678000",
        "device-drift-001:1712345679000", // gleicher Hash, anderer Timestamp
        "device-drift-002:1712345680000",
      ],
    ]);

    const result = await checkSessionDeviceDrift(mockKeys);

    expect(result.uniqueHashes).toBe(2); // Nur 2 eindeutige
    expect(result.points).toBe(10);
  });

  it("kein Session-Hash → 0 Punkte (kein Check moeglich)", async () => {
    const keysNoSession: ClientKeys = { ...mockKeys, sessionHash: null };

    const result = await checkSessionDeviceDrift(keysNoSession);

    expect(result).toEqual({ uniqueHashes: 0, points: 0 });
    expect(mockExec).not.toHaveBeenCalled();
  });

  it("kein Device-Hash → 0 Punkte (kein Check moeglich)", async () => {
    const keysNoDevice: ClientKeys = { ...mockKeys, deviceHash: null };

    const result = await checkSessionDeviceDrift(keysNoDevice);

    expect(result).toEqual({ uniqueHashes: 0, points: 0 });
    expect(mockExec).not.toHaveBeenCalled();
  });

  it("Redis-Fehler → fail-open (0 Punkte, kein Fehler)", async () => {
    mockExec.mockRejectedValue(new Error("Redis connection lost"));

    const result = await checkSessionDeviceDrift(mockKeys);

    expect(result).toEqual({ uniqueHashes: 0, points: 0 });
  });

  it("leere Redis-Antwort → 0 Punkte", async () => {
    mockExec.mockResolvedValue([1, true, 0, []]);

    const result = await checkSessionDeviceDrift(mockKeys);

    expect(result.uniqueHashes).toBe(0);
    expect(result.points).toBe(0);
  });

  it("null Redis-Antwort bei zrange → 0 Punkte", async () => {
    mockExec.mockResolvedValue([1, true, 0, null]);

    const result = await checkSessionDeviceDrift(mockKeys);

    expect(result.uniqueHashes).toBe(0);
    expect(result.points).toBe(0);
  });

  it("nutzt korrekte Redis-Keys und TTL", async () => {
    mockExec.mockResolvedValue([1, true, 0, []]);

    await checkSessionDeviceDrift(mockKeys);

    // Prüfe zadd-Key: sec:drift:{sessionHash}
    expect(mockZadd).toHaveBeenCalledWith(
      "sec:drift:sess-drift-abc",
      expect.objectContaining({
        member: expect.stringContaining("device-drift-001"),
      }),
    );

    // Prüfe expire: 30 Minuten (1800 Sekunden)
    expect(mockExpire).toHaveBeenCalledWith("sec:drift:sess-drift-abc", 1800);
  });
});
