// __tests__/lib/security/config.test.ts
// Unit-Tests fuer Security Config: classifyRoute, determineSeverity

import { describe, it, expect } from "vitest";
import { classifyRoute, determineSeverity } from "@/lib/security/config";

describe("classifyRoute", () => {
  it("klassifiziert Care-Routes als critical", () => {
    expect(classifyRoute("/api/care/medications")).toBe("critical");
    expect(classifyRoute("/api/care/tasks/123")).toBe("critical");
    expect(classifyRoute("/api/heartbeat/check")).toBe("critical");
    expect(classifyRoute("/api/export/users")).toBe("critical");
    expect(classifyRoute("/api/admin/quarters")).toBe("critical");
  });

  it("klassifiziert Auth-Routes als sensitive", () => {
    expect(classifyRoute("/api/auth/login")).toBe("sensitive");
    expect(classifyRoute("/api/register/complete")).toBe("sensitive");
    expect(classifyRoute("/api/geo/by-street")).toBe("sensitive");
    expect(classifyRoute("/api/appointments/123")).toBe("sensitive");
    expect(classifyRoute("/api/medications/list")).toBe("sensitive");
  });

  it("klassifiziert Community-Routes als standard", () => {
    expect(classifyRoute("/api/groups/123")).toBe("standard");
    expect(classifyRoute("/api/points/leaderboard")).toBe("standard");
    expect(classifyRoute("/api/prevention/courses")).toBe("standard");
    expect(classifyRoute("/api/geo/search")).toBe("standard");
  });

  it("klassifiziert Public-Routes als public", () => {
    expect(classifyRoute("/api/news/rss")).toBe("public");
    expect(classifyRoute("/api/quarter/info")).toBe("public");
    expect(classifyRoute("/api/quartier-info/hub")).toBe("public");
  });

  it("gibt standard als Fallback zurueck", () => {
    expect(classifyRoute("/api/unknown/route")).toBe("standard");
    expect(classifyRoute("/api/something")).toBe("standard");
  });
});

describe("determineSeverity", () => {
  it("gibt 'high' fuer cron_probe zurueck unabhaengig von Punkten", () => {
    expect(determineSeverity("cron_probe", 10)).toBe("high");
    expect(determineSeverity("cron_probe", 50)).toBe("high");
  });

  it("gibt 'high' bei >= 40 Punkten", () => {
    expect(determineSeverity("honeypot", 40)).toBe("high");
    expect(determineSeverity("brute_force", 50)).toBe("high");
    expect(determineSeverity("scanner_header", 100)).toBe("high");
  });

  it("gibt 'warning' bei >= 20 Punkten", () => {
    expect(determineSeverity("honeypot", 20)).toBe("warning");
    expect(determineSeverity("enumeration", 30)).toBe("warning");
    expect(determineSeverity("idor", 25)).toBe("warning");
  });

  it("gibt 'info' bei < 20 Punkten", () => {
    expect(determineSeverity("scanner_header", 10)).toBe("info");
    expect(determineSeverity("honeypot", 5)).toBe("info");
    expect(determineSeverity("brute_force", 0)).toBe("info");
  });
});
