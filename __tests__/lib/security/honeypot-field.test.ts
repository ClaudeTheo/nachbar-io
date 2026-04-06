// __tests__/lib/security/honeypot-field.test.ts
// Unit-Tests fuer Honeypot-Feld Bot-Erkennung

import { describe, it, expect, vi, beforeEach } from "vitest";

// Security-Module mocken (brauchen Redis/Supabase)
vi.mock("@/lib/security/risk-scorer", () => ({
  recordEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/security/security-logger", () => ({
  logSecurityEvent: vi.fn(),
}));

import { checkHoneypotField } from "@/lib/security/traps/honeypot-field";
import { recordEvent } from "@/lib/security/risk-scorer";
import { logSecurityEvent } from "@/lib/security/security-logger";
import type { ClientKeys } from "@/lib/security/client-key";

const mockKeys: ClientKeys = {
  ipHash: "abc123def456",
  userId: null,
  sessionHash: null,
  deviceHash: "device123abc",
  headerBitmap: 0xff,
};

describe("checkHoneypotField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("erkennt Bot wenn website-Feld ausgefuellt ist", async () => {
    const body = { email: "test@test.de", website: "http://spam.com" };
    const result = await checkHoneypotField(body, mockKeys, "/api/register/complete");

    expect(result).toBe(true);
    expect(recordEvent).toHaveBeenCalledWith(mockKeys, "honeypot", 30, ["ip", "session"]);
    expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
      trapType: "honeypot",
      points: 30,
    }));
  });

  it("erkennt Bot auch bei beliebigem String im website-Feld", async () => {
    const body = { website: "anything" };
    expect(await checkHoneypotField(body, mockKeys, "/test")).toBe(true);
  });

  it("akzeptiert leeres website-Feld", async () => {
    const body = { email: "test@test.de", website: "" };
    const result = await checkHoneypotField(body, mockKeys, "/test");

    expect(result).toBe(false);
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it("akzeptiert fehlendes website-Feld", async () => {
    const body = { email: "test@test.de" };
    const result = await checkHoneypotField(body, mockKeys, "/test");

    expect(result).toBe(false);
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it("akzeptiert nur Whitespace im website-Feld", async () => {
    const body = { website: "   " };
    const result = await checkHoneypotField(body, mockKeys, "/test");

    expect(result).toBe(false);
  });

  it("erkennt Bot bei numerischem website-Feld", async () => {
    const body = { website: 12345 };
    const result = await checkHoneypotField(body, mockKeys, "/test");

    expect(result).toBe(true); // String("12345").trim().length > 0
  });

  it("gibt korrekten routePattern an Logger weiter", async () => {
    const body = { website: "spam" };
    await checkHoneypotField(body, mockKeys, "/api/bug-reports/anonymous");

    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        routePattern: "/api/bug-reports/anonymous",
      }),
    );
  });
});
