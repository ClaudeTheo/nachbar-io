// __tests__/lib/security/enum-detector.test.ts
// Behavior-Tests fuer Enumeration-Detector (Geo-Query-Surge)

import { describe, it, expect, vi, beforeEach } from "vitest";

// Redis mocken
const mockIncr = vi.fn();
const mockExpire = vi.fn();
vi.mock("@/lib/security/redis", () => ({
  getSecurityRedis: () => ({
    incr: mockIncr,
    expire: mockExpire,
  }),
}));

const mockRecordEvent = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/security/risk-scorer", () => ({
  recordEvent: (...args: unknown[]) => mockRecordEvent(...args),
}));

const mockLogSecurityEvent = vi.fn();
vi.mock("@/lib/security/security-logger", () => ({
  logSecurityEvent: (...args: unknown[]) => mockLogSecurityEvent(...args),
}));

import { checkEnumeration } from "@/lib/security/traps/enum-detector";
import type { ClientKeys } from "@/lib/security/client-key";

const mockKeys: ClientKeys = {
  ipHash: "enum_test_ip",
  userId: null,
  sessionHash: "sess-enum",
  deviceHash: "device-enum",
  headerBitmap: 0xff,
};

const mockKeysWithUser: ClientKeys = {
  ...mockKeys,
  userId: "user-456",
};

describe("checkEnumeration (enumeration Trap)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExpire.mockResolvedValue(undefined);
  });

  it("1-5 Queries: keine Punkte, nicht blockiert", async () => {
    mockIncr.mockResolvedValue(3);

    const result = await checkEnumeration(mockKeys, "/api/geo/by-street");

    expect(result).toEqual({ blocked: false, count: 3 });
    expect(mockRecordEvent).not.toHaveBeenCalled();
    expect(mockLogSecurityEvent).not.toHaveBeenCalled();
  });

  it("erster Aufruf setzt TTL", async () => {
    mockIncr.mockResolvedValue(1);

    await checkEnumeration(mockKeys, "/api/geo/by-street");

    expect(mockExpire).toHaveBeenCalledWith("sec:enum:enum_test_ip", 300);
  });

  it("6 Queries: 15 Punkte, Stage 1, nicht blockiert", async () => {
    mockIncr.mockResolvedValue(6);

    const result = await checkEnumeration(mockKeys, "/api/geo/by-street");

    expect(result).toEqual({ blocked: false, count: 6 });
    expect(mockRecordEvent).toHaveBeenCalledWith(
      mockKeys, "enumeration", 15, ["ip", "session"],
    );
    expect(mockLogSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ trapType: "enumeration", points: 15, stage: 1 }),
    );
  });

  it("11 Queries: 30 Punkte, Stage 2", async () => {
    mockIncr.mockResolvedValue(11);

    const result = await checkEnumeration(mockKeys, "/api/geo/by-street");

    expect(result).toEqual({ blocked: false, count: 11 });
    expect(mockRecordEvent).toHaveBeenCalledWith(
      mockKeys, "enumeration", 30, ["ip", "session"],
    );
    expect(mockLogSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ points: 30, stage: 2 }),
    );
  });

  it("21 Queries: 50 Punkte, Stage 3, BLOCKIERT", async () => {
    mockIncr.mockResolvedValue(21);

    const result = await checkEnumeration(mockKeys, "/api/geo/by-street");

    expect(result).toEqual({ blocked: true, count: 21 });
    expect(mockRecordEvent).toHaveBeenCalledWith(
      mockKeys, "enumeration", 50, ["ip", "session"],
    );
    expect(mockLogSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ points: 50, stage: 3 }),
    );
  });

  it("authentifizierter User: recordEvent auf 3 Dimensionen (ip, user, session)", async () => {
    mockIncr.mockResolvedValue(7);

    await checkEnumeration(mockKeysWithUser, "/api/geo/by-street");

    expect(mockRecordEvent).toHaveBeenCalledWith(
      mockKeysWithUser, "enumeration", 15, ["ip", "user", "session"],
    );
  });

  it("routePattern wird korrekt weitergegeben", async () => {
    mockIncr.mockResolvedValue(8);

    await checkEnumeration(mockKeys, "/api/geo/search");

    expect(mockLogSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ routePattern: "/api/geo/search" }),
    );
  });

  it("Redis-Fehler: fail-open, nicht blockiert, count=0", async () => {
    mockIncr.mockRejectedValue(new Error("Redis timeout"));

    const result = await checkEnumeration(mockKeys, "/api/geo/by-street");

    expect(result).toEqual({ blocked: false, count: 0 });
    expect(mockRecordEvent).not.toHaveBeenCalled();
  });
});

describe("checkEnumeration ohne Redis", () => {
  it("gibt blocked=false, count=0 zurueck", async () => {
    const redis = await import("@/lib/security/redis");
    vi.spyOn(redis, "getSecurityRedis").mockReturnValue(null);

    const result = await checkEnumeration(mockKeys, "/api/geo/by-street");

    expect(result).toEqual({ blocked: false, count: 0 });

    vi.restoreAllMocks();
  });
});
