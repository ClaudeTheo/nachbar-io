import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSecurityRedis, mockIncr, mockExpire } = vi.hoisted(() => ({
  mockGetSecurityRedis: vi.fn(),
  mockIncr: vi.fn(),
  mockExpire: vi.fn(),
}));

vi.mock("@/lib/security/redis", () => ({
  getSecurityRedis: mockGetSecurityRedis,
  reportRedisFailure: vi.fn(),
}));

describe("AI per-user Tageslimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T09:00:00.000Z"));
    mockGetSecurityRedis.mockReturnValue({
      incr: mockIncr,
      expire: mockExpire,
    });
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("erlaubt einen KI-Call unterhalb des Tageslimits und setzt beim ersten Call ein TTL", async () => {
    const { consumeAiDailyUserLimit, AI_DAILY_USER_LIMIT } = await import(
      "@/lib/ai/rate-limit"
    );

    const result = await consumeAiDailyUserLimit({
      userId: "user-1",
    });

    expect(result).toEqual({
      allowed: true,
      limit: AI_DAILY_USER_LIMIT,
      remaining: AI_DAILY_USER_LIMIT - 1,
    });
    expect(mockIncr).toHaveBeenCalledWith("ai:daily:user:user-1:2026-05-04");
    expect(mockExpire).toHaveBeenCalledWith(
      "ai:daily:user:user-1:2026-05-04",
      172800,
    );
  });

  it("blockiert ab dem ersten Call ueber dem Tageslimit", async () => {
    const { consumeAiDailyUserLimit, AI_DAILY_USER_LIMIT } = await import(
      "@/lib/ai/rate-limit"
    );
    mockIncr.mockResolvedValue(AI_DAILY_USER_LIMIT + 1);

    const result = await consumeAiDailyUserLimit({
      userId: "user-1",
    });

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(AI_DAILY_USER_LIMIT);
    expect(result.remaining).toBe(0);
  });

  it("liefert unavailable wenn Redis fuer das serverseitige Limit fehlt", async () => {
    const { consumeAiDailyUserLimit } = await import("@/lib/ai/rate-limit");
    mockGetSecurityRedis.mockReturnValue(null);

    const result = await consumeAiDailyUserLimit({
      userId: "user-1",
    });

    expect(result).toEqual({
      allowed: false,
      unavailable: true,
      limit: 100,
      remaining: 0,
    });
    expect(mockIncr).not.toHaveBeenCalled();
  });

  it("liefert unavailable wenn Redis den Zaehler nicht schreiben kann", async () => {
    const { consumeAiDailyUserLimit } = await import("@/lib/ai/rate-limit");
    mockIncr.mockRejectedValue(new Error("redis down"));

    const result = await consumeAiDailyUserLimit({
      userId: "user-1",
    });

    expect(result).toEqual({
      allowed: false,
      unavailable: true,
      limit: 100,
      remaining: 0,
    });
  });
});

describe("Realtime Voice Stundenlimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSecurityRedis.mockReturnValue({
      incr: mockIncr,
      expire: mockExpire,
    });
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(1);
  });

  it("erlaubt hoechstens acht Sitzungsstarts pro Nutzer und Stunde", async () => {
    const { consumeRealtimeVoiceSessionLimit, REALTIME_VOICE_HOURLY_LIMIT } =
      await import("@/lib/ai/rate-limit");

    const result = await consumeRealtimeVoiceSessionLimit({ userId: "user-7" });

    expect(result).toEqual({
      allowed: true,
      limit: REALTIME_VOICE_HOURLY_LIMIT,
      remaining: 7,
    });
    expect(mockIncr).toHaveBeenCalledWith("ai:realtime-voice:user:user-7");
    expect(mockExpire).toHaveBeenCalledWith("ai:realtime-voice:user:user-7", 3600);
  });

  it("blockiert den neunten Sitzungsstart", async () => {
    const { consumeRealtimeVoiceSessionLimit } = await import("@/lib/ai/rate-limit");
    mockIncr.mockResolvedValue(9);

    const result = await consumeRealtimeVoiceSessionLimit({ userId: "user-7" });

    expect(result).toEqual({ allowed: false, limit: 8, remaining: 0 });
  });

  it("schliesst bei fehlendem Redis den teuren Pfad", async () => {
    const { consumeRealtimeVoiceSessionLimit } = await import("@/lib/ai/rate-limit");
    mockGetSecurityRedis.mockReturnValue(null);

    await expect(
      consumeRealtimeVoiceSessionLimit({ userId: "user-7" }),
    ).resolves.toEqual({
      allowed: false,
      unavailable: true,
      limit: 8,
      remaining: 0,
    });
  });
});
