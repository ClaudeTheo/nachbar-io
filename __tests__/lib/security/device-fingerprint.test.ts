// __tests__/lib/security/device-fingerprint.test.ts
// Unit-Tests fuer Device Fingerprinting: Bitmap, Hash, Stabilitaet, Drift

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Tests fuer buildHeaderPresenceBitmap (reine Funktion, kein Mock noetig) ---

import {
  buildDeviceHash,
  buildHeaderPresenceBitmap,
  hashSession,
} from "@/lib/security/client-key";

function makeHeaders(present: Record<string, string>): {
  get(name: string): string | null;
} {
  return {
    get(name: string) {
      return present[name.toLowerCase()] ?? null;
    },
  };
}

describe("buildHeaderPresenceBitmap", () => {
  it("gibt 0x00 fuer leere Headers (curl-aehnlich)", () => {
    expect(buildHeaderPresenceBitmap(makeHeaders({}))).toBe(0x00);
  });

  it("gibt 0xFF fuer vollstaendige Chrome-Headers", () => {
    const bitmap = buildHeaderPresenceBitmap(
      makeHeaders({
        accept: "text/html",
        "accept-language": "de-DE",
        "accept-encoding": "gzip, br",
        "sec-ch-ua": '"Chromium";v="130"',
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "navigate",
        "upgrade-insecure-requests": "1",
        referer: "https://nachbar.io/",
      }),
    );
    expect(bitmap).toBe(0xff);
  });

  it("gibt ~0xC7 fuer Firefox (kein sec-ch-ua, kein sec-fetch-*)", () => {
    const bitmap = buildHeaderPresenceBitmap(
      makeHeaders({
        accept: "text/html",
        "accept-language": "de-DE",
        "accept-encoding": "gzip, br",
        // Kein sec-ch-ua (Chromium-only)
        // Kein sec-fetch-site/mode (Firefox sendet diese teils)
        "upgrade-insecure-requests": "1",
        referer: "https://nachbar.io/",
      }),
    );
    // Bits: accept(1) + lang(2) + encoding(4) + upgrade(64) + referer(128) = 0xC7
    expect(bitmap).toBe(0xc7);
  });

  it("gibt 0x05 fuer Python requests (nur accept + encoding)", () => {
    const bitmap = buildHeaderPresenceBitmap(
      makeHeaders({
        accept: "*/*",
        "accept-encoding": "gzip, deflate",
      }),
    );
    expect(bitmap).toBe(0x05);
  });

  it("erkennt Safari-Pattern (kein sec-ch-ua)", () => {
    const bitmap = buildHeaderPresenceBitmap(
      makeHeaders({
        accept: "text/html",
        "accept-language": "de-de",
        "accept-encoding": "gzip, deflate, br",
        // Safari sendet kein sec-ch-ua
        "upgrade-insecure-requests": "1",
        referer: "https://nachbar.io/dashboard",
      }),
    );
    // Bits: accept(1) + lang(2) + encoding(4) + upgrade(64) + referer(128) = 0xC7
    expect(bitmap).toBe(0xc7);
  });

  it("erkennt einzelne Header korrekt", () => {
    expect(
      buildHeaderPresenceBitmap(makeHeaders({ accept: "text/html" })),
    ).toBe(0x01);
    expect(
      buildHeaderPresenceBitmap(makeHeaders({ "accept-language": "de" })),
    ).toBe(0x02);
    expect(buildHeaderPresenceBitmap(makeHeaders({ "sec-ch-ua": '"x"' }))).toBe(
      0x08,
    );
    expect(
      buildHeaderPresenceBitmap(makeHeaders({ referer: "https://x.de" })),
    ).toBe(0x80);
  });
});

describe("buildDeviceHash", () => {
  it("bleibt fuer denselben Browser ueber Navigation und Fetch-Requests stabil", async () => {
    const browserUa =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";
    const navigationHeaders = makeHeaders({
      "user-agent": browserUa,
      accept: "text/html,application/xhtml+xml",
      "accept-language": "de-DE,de;q=0.9",
      "accept-encoding": "gzip, deflate, br, zstd",
      "sec-ch-ua": '"Chromium";v="135", "Not:A-Brand";v="24"',
      "sec-ch-ua-platform": '"Windows"',
      "sec-ch-ua-mobile": "?0",
      "sec-fetch-site": "none",
      "sec-fetch-mode": "navigate",
      "upgrade-insecure-requests": "1",
    });
    const fetchHeaders = makeHeaders({
      "user-agent": browserUa,
      accept: "*/*",
      "accept-language": "de-DE,de;q=0.9",
      "accept-encoding": "gzip, deflate, br, zstd",
      "sec-ch-ua": '"Chromium";v="135", "Not:A-Brand";v="24"',
      "sec-ch-ua-platform": '"Windows"',
      "sec-ch-ua-mobile": "?0",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      referer: "http://localhost:3001/map",
    });

    const navigationHash = await buildDeviceHash(navigationHeaders);
    const fetchHash = await buildDeviceHash(fetchHeaders);

    expect(fetchHash).toBe(navigationHash);
  });

  it("trennt Browser und Script-Clients trotz aehnlicher Basis-Header", async () => {
    const browserHeaders = makeHeaders({
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
      accept: "text/html",
      "accept-language": "de-DE,de;q=0.9",
      "accept-encoding": "gzip, deflate, br",
    });
    const scriptHeaders = makeHeaders({
      "user-agent": "curl/8.7.1",
      accept: "*/*",
      "accept-encoding": "gzip",
    });

    const browserHash = await buildDeviceHash(browserHeaders);
    const scriptHash = await buildDeviceHash(scriptHeaders);

    expect(scriptHash).not.toBe(browserHash);
  });
});

describe("hashSession", () => {
  function toSupabaseCookie(payload: {
    access_token?: string;
    refresh_token?: string;
  }): string {
    return `base64-${Buffer.from(JSON.stringify(payload), "utf8").toString("base64")}`;
  }

  it("unterscheidet verschiedene Supabase-SSR-Sessions trotz gleichem Cookie-Praefix", async () => {
    const sessionA = toSupabaseCookie({
      access_token: "access-a",
      refresh_token: "refresh-a",
    });
    const sessionB = toSupabaseCookie({
      access_token: "access-a",
      refresh_token: "refresh-b",
    });

    expect(await hashSession(sessionA)).not.toBe(await hashSession(sessionB));
  });

  it("faellt fuer normale Bearer-Token auf den Originalwert zurueck", async () => {
    expect(await hashSession("token-a")).not.toBe(await hashSession("token-b"));
  });
});

// --- Tests fuer fpInstabilityPoints + sessionDriftPoints (reine Funktionen) ---

import {
  fpInstabilityPoints,
  sessionDriftPoints,
} from "@/lib/security/risk-scorer";

describe("fpInstabilityPoints (gestaffelte Bewertung)", () => {
  it("0 bei 0 oder 1 einzigartigem Hash", () => {
    expect(fpInstabilityPoints(0)).toBe(0);
    expect(fpInstabilityPoints(1)).toBe(0);
  });

  it("5 bei 2 verschiedenen Hashes", () => {
    expect(fpInstabilityPoints(2)).toBe(5);
  });

  it("15 bei 3 verschiedenen Hashes", () => {
    expect(fpInstabilityPoints(3)).toBe(15);
  });

  it("20 bei 4 verschiedenen Hashes", () => {
    expect(fpInstabilityPoints(4)).toBe(20);
  });

  it("30 bei 5+ verschiedenen Hashes (Bot-Farm-Verdacht)", () => {
    expect(fpInstabilityPoints(5)).toBe(30);
    expect(fpInstabilityPoints(10)).toBe(30);
    expect(fpInstabilityPoints(100)).toBe(30);
  });
});

describe("sessionDriftPoints (gestaffelte Bewertung)", () => {
  it("0 bei 0 oder 1 einzigartigem Hash", () => {
    expect(sessionDriftPoints(0)).toBe(0);
    expect(sessionDriftPoints(1)).toBe(0);
  });

  it("10 bei 2 verschiedenen (koennte VPN-Wechsel sein)", () => {
    expect(sessionDriftPoints(2)).toBe(10);
  });

  it("25 bei 3 verschiedenen (stark verdaechtig)", () => {
    expect(sessionDriftPoints(3)).toBe(25);
  });

  it("40 bei 4+ verschiedenen (Bot-Farm)", () => {
    expect(sessionDriftPoints(4)).toBe(40);
    expect(sessionDriftPoints(8)).toBe(40);
  });
});

// --- Tests fuer kontextabhaengige Device-Gewichtung in getScores ---

// Wir testen die Gewichtungslogik indirekt ueber getScores
// Mock-Setup: Redis mit vordefinierten Scores

vi.mock("@/lib/security/redis", () => ({
  getSecurityRedis: vi.fn(),
  reportRedisFailure: vi.fn(),
}));

import { getScores } from "@/lib/security/risk-scorer";
import { getSecurityRedis } from "@/lib/security/redis";
import type { ClientKeys } from "@/lib/security/client-key";

const mockedGetRedis = vi.mocked(getSecurityRedis);

function mockRedisWithScores(
  ipEvents: string[],
  sessionEvents: string[],
  deviceEvents: string[],
) {
  const now = Date.now();
  const mockRedis = {
    zrange: vi.fn().mockImplementation((key: string) => {
      if (key.includes(":ip:")) return Promise.resolve(ipEvents);
      if (key.includes(":sess:")) return Promise.resolve(sessionEvents);
      if (key.includes(":dev:")) return Promise.resolve(deviceEvents);
      return Promise.resolve([]);
    }),
    zremrangebyscore: vi.fn().mockResolvedValue(0),
  };
  mockedGetRedis.mockReturnValue(
    mockRedis as NonNullable<ReturnType<typeof getSecurityRedis>>,
  );
  return { mockRedis, now };
}

// Helper: Erzeugt Redis-Events (Format: {ts}:{trapType}:{points}:{nonce})
function makeEvent(
  trapType: string,
  points: number,
  ageMs = 0,
): [string, number] {
  const ts = Date.now() - ageMs;
  return [`${ts}:${trapType}:${points}:abcd`, ts];
}

const baseKeys: ClientKeys = {
  ipHash: "ip123",
  userId: null,
  sessionHash: "sess456",
  deviceHash: "dev789",
  headerBitmap: 0xff,
};

describe("getScores — kontextabhaengige Device-Gewichtung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignoriert Device-Score bei baseScore < 10", async () => {
    // IP-Score 5 (unter Schwelle 10), Device-Score 30
    const [ipEvt, ipTs] = makeEvent("scanner_header", 5);
    const [devEvt, devTs] = makeEvent("fp_instability", 30);
    mockRedisWithScores([ipEvt, String(ipTs)], [], [devEvt, String(devTs)]);

    const result = await getScores(baseKeys);
    // baseScore = max(5, 0) + 0.25 * 0 = 5
    // deviceWeight = 0 (baseScore < 10)
    // effectiveScore = 5 + 0 * 30 = 5
    expect(result.deviceScore).toBeGreaterThan(0);
    expect(result.effectiveScore).toBeLessThanOrEqual(10);
  });

  it("gewichtet Device mit 0.3 bei baseScore 10-49", async () => {
    // IP-Score ~25, Device-Score ~20
    const [ipEvt, ipTs] = makeEvent("enumeration", 25);
    const [devEvt, devTs] = makeEvent("fp_instability", 20);
    mockRedisWithScores([ipEvt, String(ipTs)], [], [devEvt, String(devTs)]);

    const result = await getScores(baseKeys);
    // baseScore = 25, deviceWeight = 0.3
    // effectiveScore ≈ 25 + 0.3 * 20 = 31
    expect(result.effectiveScore).toBeGreaterThan(25);
    expect(result.effectiveScore).toBeLessThanOrEqual(35);
  });

  it("gewichtet Device mit 0.5 bei baseScore >= 50", async () => {
    // IP-Score ~60, Device-Score ~30
    const [ipEvt, ipTs] = makeEvent("cron_probe", 60);
    const [devEvt, devTs] = makeEvent("fp_instability", 30);
    mockRedisWithScores([ipEvt, String(ipTs)], [], [devEvt, String(devTs)]);

    const result = await getScores(baseKeys);
    // baseScore = 60, deviceWeight = 0.5
    // effectiveScore ≈ 60 + 0.5 * 30 = 75
    expect(result.effectiveScore).toBeGreaterThan(60);
    expect(result.effectiveScore).toBeLessThanOrEqual(80);
  });

  it("gibt deviceScore 0 ohne Device-Hash", async () => {
    const keysNoDevice = { ...baseKeys, deviceHash: null };
    mockRedisWithScores([], [], []);

    const result = await getScores(keysNoDevice);
    expect(result.deviceScore).toBe(0);
  });

  it("zaehlt Device NICHT als elevated Dimension (nur Verstaerker, kein Stage-4-Gate)", async () => {
    // Nur Device-Score hoch, IP/User/Session bei 0
    const [devEvt, devTs] = makeEvent("fp_instability", 25);
    mockRedisWithScores([], [], [devEvt, String(devTs)]);

    const result = await getScores(baseKeys);
    // Device wird NICHT als unabhaengige Dimension gezaehlt
    expect(result.elevatedDimensions).toBe(0);
    expect(result.deviceScore).toBeGreaterThan(0);
  });

  it("fail-open: Score 0 ohne Redis", async () => {
    mockedGetRedis.mockReturnValue(null);

    const result = await getScores(baseKeys);
    expect(result.effectiveScore).toBe(0);
    expect(result.deviceScore).toBe(0);
    expect(result.stage).toBe(0);
  });
});
