// __tests__/lib/security/security-middleware.test.ts
// Behavior-Tests fuer Security-Middleware: fake_admin, cron_probe, scanner_header
// Testet checkSecurity() mit gemockten Dependencies

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

const mockBuildClientKeys = vi.fn();
vi.mock("@/lib/security/client-key", () => ({
  buildClientKeys: (...args: unknown[]) => mockBuildClientKeys(...args),
}));

const mockGetScores = vi.fn();
const mockRecordEvent = vi.fn().mockResolvedValue(undefined);
const mockCheckFpStability = vi.fn();
const mockCheckSessionDrift = vi.fn();
vi.mock("@/lib/security/risk-scorer", () => ({
  getScores: (...args: unknown[]) => mockGetScores(...args),
  recordEvent: (...args: unknown[]) => mockRecordEvent(...args),
  checkFingerprintStability: (...args: unknown[]) => mockCheckFpStability(...args),
  checkSessionDeviceDrift: (...args: unknown[]) => mockCheckSessionDrift(...args),
}));

vi.mock("@/lib/security/security-logger", () => ({
  logSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/security/forensic-logger", () => ({
  logForensicData: vi.fn(),
}));

import { checkSecurity } from "@/lib/security/security-middleware";
import type { ClientKeys } from "@/lib/security/client-key";

// Standard ClientKeys fuer alle Tests
const defaultKeys: ClientKeys = {
  ipHash: "mw_test_ip",
  userId: null,
  sessionHash: "sess-mw",
  deviceHash: "device-mw",
  headerBitmap: 0xff,
};

// Standard-Scores: sauber, keine Vorbelastung
const cleanScores = {
  ipScore: 0,
  userScore: 0,
  sessionScore: 0,
  deviceScore: 0,
  effectiveScore: 0,
  stage: 0,
  trapTypes: new Set<string>(),
  elevatedDimensions: 0,
};

function createRequest(url: string, headers: Record<string, string> = {}): NextRequest {
  const fullUrl = `http://localhost:3000${url}`;
  const req = new NextRequest(fullUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      accept: "text/html,application/json",
      "accept-language": "de-DE,de;q=0.9",
      "accept-encoding": "gzip, deflate, br",
      ...headers,
    },
  });
  return req;
}

describe("checkSecurity — fake_admin Trap (Honeypot-Pfade)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildClientKeys.mockResolvedValue(defaultKeys);
    mockGetScores.mockResolvedValue(cleanScores);
    mockCheckFpStability.mockResolvedValue({ uniqueHashes: 0, points: 0 });
    mockCheckSessionDrift.mockResolvedValue({ uniqueHashes: 0, points: 0 });
  });

  it("blockiert /.env mit 404, Stage 2, 40 Punkte", async () => {
    const req = createRequest("/.env");
    const result = await checkSecurity(req);

    expect(result.allowed).toBe(false);
    expect(result.stage).toBe(2);
    expect(result.effectiveScore).toBe(40);
    expect(result.response?.status).toBe(404);
    expect(mockRecordEvent).toHaveBeenCalledWith(defaultKeys, "fake_admin", 40, ["ip", "session"]);
  });

  it("blockiert /wp-admin", async () => {
    const req = createRequest("/wp-admin");
    const result = await checkSecurity(req);

    expect(result.allowed).toBe(false);
    expect(result.response?.status).toBe(404);
  });

  it("blockiert /wp-login.php", async () => {
    const req = createRequest("/wp-login.php");
    const result = await checkSecurity(req);

    expect(result.allowed).toBe(false);
  });

  it("blockiert /phpmyadmin", async () => {
    const req = createRequest("/phpmyadmin");
    const result = await checkSecurity(req);

    expect(result.allowed).toBe(false);
  });

  it("blockiert /.git/config", async () => {
    const req = createRequest("/.git/config");
    const result = await checkSecurity(req);

    expect(result.allowed).toBe(false);
  });

  it("blockiert /api/internal/debug", async () => {
    const req = createRequest("/api/internal/debug");
    const result = await checkSecurity(req);

    expect(result.allowed).toBe(false);
  });

  it("blockiert /api/admin/config (Honeypot, nicht echter Admin)", async () => {
    const req = createRequest("/api/admin/config");
    const result = await checkSecurity(req);

    expect(result.allowed).toBe(false);
  });

  it("blockiert auch Subpfade von Honeypots (z.B. /wp-admin/ajax.php)", async () => {
    const req = createRequest("/wp-admin/ajax.php");
    const result = await checkSecurity(req);

    expect(result.allowed).toBe(false);
  });

  it("ist case-insensitive (/.ENV → blockiert)", async () => {
    const req = createRequest("/.ENV");
    const result = await checkSecurity(req);

    expect(result.allowed).toBe(false);
  });

  it("blockiert NICHT normale API-Pfade", async () => {
    const req = createRequest("/api/news/rss");
    const result = await checkSecurity(req);

    expect(result.allowed).toBe(true);
    // Kein fake_admin recordEvent
    expect(mockRecordEvent).not.toHaveBeenCalledWith(
      expect.anything(), "fake_admin", expect.anything(), expect.anything(),
    );
  });
});

describe("checkSecurity — cron_probe Trap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildClientKeys.mockResolvedValue(defaultKeys);
    mockGetScores.mockResolvedValue(cleanScores);
    mockCheckFpStability.mockResolvedValue({ uniqueHashes: 0, points: 0 });
    mockCheckSessionDrift.mockResolvedValue({ uniqueHashes: 0, points: 0 });
  });

  it("erkennt Zugriff auf /api/cron/* ohne Auth als cron_probe", async () => {
    // CRON_SECRET setzen
    const originalSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "test-cron-secret-123";

    const req = createRequest("/api/cron/daily-checkin");
    const result = await checkSecurity(req);

    // Request wird durchgelassen (cron_probe blockiert nicht direkt),
    // aber 50 Punkte werden aufgezeichnet
    expect(mockRecordEvent).toHaveBeenCalledWith(defaultKeys, "cron_probe", 50, ["ip", "session"]);

    process.env.CRON_SECRET = originalSecret;
  });

  it("erkennt falsches Bearer-Token als cron_probe", async () => {
    const originalSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "correct-secret";

    const req = createRequest("/api/cron/medications", {
      authorization: "Bearer wrong-secret",
    });
    await checkSecurity(req);

    expect(mockRecordEvent).toHaveBeenCalledWith(
      defaultKeys, "cron_probe", 50, ["ip", "session"],
    );

    process.env.CRON_SECRET = originalSecret;
  });

  it("loest KEINEN cron_probe bei korrekt authentifiziertem Cron-Request aus", async () => {
    const originalSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "valid-cron-secret";

    const req = createRequest("/api/cron/appointments", {
      authorization: "Bearer valid-cron-secret",
    });
    await checkSecurity(req);

    // Kein cron_probe Event
    expect(mockRecordEvent).not.toHaveBeenCalledWith(
      expect.anything(), "cron_probe", expect.anything(), expect.anything(),
    );

    process.env.CRON_SECRET = originalSecret;
  });

  it("erkennt cron_probe wenn CRON_SECRET nicht gesetzt ist", async () => {
    const originalSecret = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;

    const req = createRequest("/api/cron/tasks");
    await checkSecurity(req);

    expect(mockRecordEvent).toHaveBeenCalledWith(
      defaultKeys, "cron_probe", 50, ["ip", "session"],
    );

    process.env.CRON_SECRET = originalSecret;
  });
});

describe("checkSecurity — scanner_header Trap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildClientKeys.mockResolvedValue(defaultKeys);
    mockGetScores.mockResolvedValue(cleanScores);
    mockCheckFpStability.mockResolvedValue({ uniqueHashes: 0, points: 0 });
    mockCheckSessionDrift.mockResolvedValue({ uniqueHashes: 0, points: 0 });
  });

  it("erkennt sqlmap User-Agent (40 Punkte)", async () => {
    const req = createRequest("/api/news/rss", {
      "user-agent": "sqlmap/1.5.2#stable",
    });
    await checkSecurity(req);

    // 40 (scanner) + 10 (kein accept-language typisch) = mind. 40
    expect(mockRecordEvent).toHaveBeenCalledWith(
      defaultKeys, "scanner_header", expect.any(Number), ["ip", "session"],
    );
    // Mindestens 40 Punkte wegen Scanner-UA
    const callArgs = mockRecordEvent.mock.calls.find(
      (c) => c[1] === "scanner_header",
    );
    expect(callArgs).toBeDefined();
    expect(callArgs![2]).toBeGreaterThanOrEqual(40);
  });

  it("erkennt nikto User-Agent", async () => {
    const req = createRequest("/api/groups/list", {
      "user-agent": "Nikto/2.1.6",
    });
    await checkSecurity(req);

    expect(mockRecordEvent).toHaveBeenCalledWith(
      defaultKeys, "scanner_header", expect.any(Number), ["ip", "session"],
    );
  });

  it("erkennt burpsuite User-Agent", async () => {
    const req = createRequest("/api/auth/login", {
      "user-agent": "BurpSuite/2023.10",
    });
    await checkSecurity(req);

    const callArgs = mockRecordEvent.mock.calls.find(
      (c) => c[1] === "scanner_header",
    );
    expect(callArgs).toBeDefined();
    expect(callArgs![2]).toBeGreaterThanOrEqual(40);
  });

  it("erkennt fehlenden/kurzen User-Agent (10 Punkte)", async () => {
    const req = createRequest("/api/news/rss", {
      "user-agent": "curl",
    });
    await checkSecurity(req);

    // "curl" ist < 5 Zeichen → 10 Punkte
    expect(mockRecordEvent).toHaveBeenCalledWith(
      defaultKeys, "scanner_header", expect.any(Number), ["ip", "session"],
    );
  });

  it("erkennt verdaechtige Proxy-Chain (>5 IPs, +10 Punkte)", async () => {
    const req = createRequest("/api/news/rss", {
      "user-agent": "", // +10 Punkte fuer leeren UA
      "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4, 5.5.5.5, 6.6.6.6",
    });
    await checkSecurity(req);

    const callArgs = mockRecordEvent.mock.calls.find(
      (c) => c[1] === "scanner_header",
    );
    expect(callArgs).toBeDefined();
    // Leerer UA (10) + Proxy-Chain (10) = 20
    expect(callArgs![2]).toBeGreaterThanOrEqual(20);
  });

  it("normaler Browser-UA loest KEINEN scanner_header aus", async () => {
    const req = createRequest("/api/news/rss", {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      accept: "text/html",
      "accept-language": "de-DE",
      "accept-encoding": "gzip",
    });
    await checkSecurity(req);

    expect(mockRecordEvent).not.toHaveBeenCalledWith(
      expect.anything(), "scanner_header", expect.anything(), expect.anything(),
    );
  });
});

describe("checkSecurity — E2E-Bypass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildClientKeys.mockResolvedValue(defaultKeys);
  });

  it("bypassed Security bei korrektem E2E-Header", async () => {
    const originalBypass = process.env.SECURITY_E2E_BYPASS;
    process.env.SECURITY_E2E_BYPASS = "test-bypass-secret";

    const req = createRequest("/.env", {
      "x-nachbar-test-mode": "test-bypass-secret",
    });
    const result = await checkSecurity(req);

    expect(result.allowed).toBe(true);
    expect(result.stage).toBe(0);
    expect(result.effectiveScore).toBe(0);
    // Keine Security-Checks ausgefuehrt
    expect(mockRecordEvent).not.toHaveBeenCalled();

    process.env.SECURITY_E2E_BYPASS = originalBypass;
  });

  it("kein Bypass bei falschem Header", async () => {
    const originalBypass = process.env.SECURITY_E2E_BYPASS;
    process.env.SECURITY_E2E_BYPASS = "correct-secret";

    const req = createRequest("/.env", {
      "x-nachbar-test-mode": "wrong-secret",
    });
    const result = await checkSecurity(req);

    expect(result.allowed).toBe(false); // Honeypot-Pfad greift

    process.env.SECURITY_E2E_BYPASS = originalBypass;
  });
});
