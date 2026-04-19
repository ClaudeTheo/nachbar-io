// __tests__/api/device/pair-start.test.ts
// Welle B Task B3: API /api/device/pair/start
// @vitest-environment node

import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

describe("POST /api/device/pair/start", () => {
  beforeEach(() => {
    process.env.DEVICE_PAIRING_SECRET = "test-secret-32-bytes-1234567890abcdef";
  });

  it("liefert JWT + device_id + expires_in zurueck", async () => {
    const { POST } = await import("@/app/api/device/pair/start/route");
    const req = new NextRequest("http://localhost/api/device/pair/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ device_id: "dev-1", user_agent: "Capacitor iOS" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toMatch(/^eyJ/);
    expect(data.device_id).toBe("dev-1");
    expect(data.pair_id).toBeDefined();
    expect(data.expires_in).toBe(600);
  });

  it("lehnt Request ohne device_id ab (400)", async () => {
    const { POST } = await import("@/app/api/device/pair/start/route");
    const req = new NextRequest("http://localhost/api/device/pair/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("lehnt Request mit zu langem device_id ab (400)", async () => {
    const { POST } = await import("@/app/api/device/pair/start/route");
    const longId = "a".repeat(300);
    const req = new NextRequest("http://localhost/api/device/pair/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ device_id: longId }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("akzeptiert Request ohne user_agent", async () => {
    const { POST } = await import("@/app/api/device/pair/start/route");
    const req = new NextRequest("http://localhost/api/device/pair/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ device_id: "dev-2" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("lehnt Garbage-Body ab (400)", async () => {
    const { POST } = await import("@/app/api/device/pair/start/route");
    const req = new NextRequest("http://localhost/api/device/pair/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
