// __tests__/lib/security/trap-utils.test.ts
// Unit-Tests fuer buildClientKeysNode (Node.js-Runtime API-Route Helper)

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Crypto-Modul mocken (default-Export beibehalten)
vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  return {
    ...actual,
    createHash: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi
        .fn()
        .mockReturnValue(
          "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        ),
    })),
  };
});

import { buildClientKeysNode } from "@/lib/security/traps/trap-utils";

function mockRequest(
  overrides: {
    forwardedFor?: string | null;
    realIp?: string | null;
    ip?: string;
  } = {},
): NextRequest {
  return {
    headers: {
      get: (name: string) => {
        if (name === "x-forwarded-for") return overrides.forwardedFor ?? null;
        if (name === "x-real-ip") return overrides.realIp ?? null;
        return null;
      },
    },
    ip: overrides.ip,
  } as unknown as NextRequest;
}

describe("buildClientKeysNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extrahiert IP aus x-forwarded-for (erste IP)", () => {
    const req = mockRequest({ forwardedFor: "1.2.3.4, 5.6.7.8" });
    const keys = buildClientKeysNode(req);
    expect(keys.ipHash).toBeDefined();
    expect(keys.ipHash.length).toBe(16);
  });

  it("nutzt x-real-ip als Fallback", () => {
    const req = mockRequest({ realIp: "10.0.0.1" });
    const keys = buildClientKeysNode(req);
    expect(keys.ipHash).toBeDefined();
    expect(keys.ipHash.length).toBe(16);
  });

  it("nutzt request.ip als letzten Fallback", () => {
    const req = mockRequest({ ip: "192.168.1.1" });
    const keys = buildClientKeysNode(req);
    expect(keys.ipHash).toBeDefined();
  });

  it("faellt zurueck auf 'unknown' ohne IP-Quellen", () => {
    const req = mockRequest();
    const keys = buildClientKeysNode(req);
    expect(keys.ipHash).toBeDefined();
  });

  it("setzt userId wenn uebergeben", () => {
    const req = mockRequest({ forwardedFor: "1.2.3.4" });
    const keys = buildClientKeysNode(req, "user-123");
    expect(keys.userId).toBe("user-123");
  });

  it("setzt userId auf null ohne Parameter", () => {
    const req = mockRequest({ forwardedFor: "1.2.3.4" });
    const keys = buildClientKeysNode(req);
    expect(keys.userId).toBeNull();
  });

  it("setzt sessionHash auf null (in API-Routes nicht noetig)", () => {
    const req = mockRequest({ forwardedFor: "1.2.3.4" });
    const keys = buildClientKeysNode(req);
    expect(keys.sessionHash).toBeNull();
  });

  it("gibt konsistente Hash-Laenge zurueck", () => {
    const req = mockRequest({ forwardedFor: "203.0.113.42" });
    const keys = buildClientKeysNode(req);
    expect(keys.ipHash).toHaveLength(16);
  });
});
