// lib/device-pairing/__tests__/token.test.ts
// Welle B Task B2: JWT Pairing Token Lib
// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createPairingToken,
  verifyPairingToken,
  PAIRING_TOKEN_TTL_SECONDS,
} from "@/lib/device-pairing/token";

describe("createPairingToken", () => {
  beforeEach(() => {
    process.env.DEVICE_PAIRING_SECRET = "test-secret-32-bytes-1234567890abcdef";
  });

  it("erzeugt einen JWT-String und ein Payload-Objekt", async () => {
    const { token, payload } = await createPairingToken({
      device_id: "dev-1",
      user_agent: "iPhone 15",
    });
    expect(token).toMatch(/^eyJ/);
    expect(payload.device_id).toBe("dev-1");
    expect(payload.user_agent).toBe("iPhone 15");
    expect(typeof payload.iat).toBe("number");
    expect(payload.exp - payload.iat).toBe(PAIRING_TOKEN_TTL_SECONDS);
  });

  it("akzeptiert Request ohne user_agent", async () => {
    const { token, payload } = await createPairingToken({ device_id: "d2" });
    expect(token).toBeTruthy();
    expect(payload.user_agent).toBeUndefined();
  });

  it("erzeugt einen pair_id (uuid-aehnlich) im Payload", async () => {
    const { payload } = await createPairingToken({ device_id: "d3" });
    expect(typeof payload.pair_id).toBe("string");
    expect(payload.pair_id.length).toBeGreaterThan(8);
  });

  it("erzeugt zwei verschiedene pair_ids fuer zwei Aufrufe", async () => {
    const a = await createPairingToken({ device_id: "d4" });
    const b = await createPairingToken({ device_id: "d4" });
    expect(a.payload.pair_id).not.toBe(b.payload.pair_id);
  });
});

describe("verifyPairingToken", () => {
  beforeEach(() => {
    process.env.DEVICE_PAIRING_SECRET = "test-secret-32-bytes-1234567890abcdef";
  });

  it("akzeptiert einen frisch erzeugten Token", async () => {
    const { token } = await createPairingToken({ device_id: "dev-x" });
    const res = await verifyPairingToken(token);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.payload.device_id).toBe("dev-x");
    }
  });

  it("lehnt einen manipulierten Token ab", async () => {
    const { token } = await createPairingToken({ device_id: "dev-x" });
    const tampered = token.slice(0, -2) + "XY";
    const res = await verifyPairingToken(tampered);
    expect(res.valid).toBe(false);
  });

  it("lehnt einen Token mit anderem Secret ab", async () => {
    const { token } = await createPairingToken({ device_id: "dev-x" });
    process.env.DEVICE_PAIRING_SECRET = "ein-komplett-anderes-secret-aaaaaaaa";
    // jose-Module laedt SECRET dynamisch via getter
    const res = await verifyPairingToken(token);
    expect(res.valid).toBe(false);
  });

  it("lehnt Muell ab", async () => {
    const res = await verifyPairingToken("not-a-jwt");
    expect(res.valid).toBe(false);
  });

  it("lehnt einen abgelaufenen Token ab", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-04-19T12:00:00Z"));
      const { token } = await createPairingToken({ device_id: "dev-x" });
      vi.setSystemTime(new Date("2026-04-19T12:11:00Z")); // +11 min, > 10 min TTL
      const res = await verifyPairingToken(token);
      expect(res.valid).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
