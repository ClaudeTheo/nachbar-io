// Tests fuer UX-Redesign Feature-Flags
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isUxRedesignEnabled } from "@/lib/ux-flags";

describe("isUxRedesignEnabled", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("gibt false zurueck wenn Flag nicht gesetzt", () => {
    delete process.env.NEXT_PUBLIC_UX_REDESIGN_NAV;
    expect(isUxRedesignEnabled("UX_REDESIGN_NAV")).toBe(false);
  });

  it("gibt true zurueck wenn Flag auf 'true' steht", () => {
    process.env.NEXT_PUBLIC_UX_REDESIGN_NAV = "true";
    expect(isUxRedesignEnabled("UX_REDESIGN_NAV")).toBe(true);
  });

  it("gibt false zurueck bei anderem Wert", () => {
    process.env.NEXT_PUBLIC_UX_REDESIGN_NAV = "false";
    expect(isUxRedesignEnabled("UX_REDESIGN_NAV")).toBe(false);
  });

  it("funktioniert fuer DASHBOARD Flag", () => {
    process.env.NEXT_PUBLIC_UX_REDESIGN_DASHBOARD = "true";
    expect(isUxRedesignEnabled("UX_REDESIGN_DASHBOARD")).toBe(true);
  });

  it("funktioniert fuer ILLUSTRATIONS Flag", () => {
    expect(isUxRedesignEnabled("UX_REDESIGN_ILLUSTRATIONS")).toBe(false);
    process.env.NEXT_PUBLIC_UX_REDESIGN_ILLUSTRATIONS = "true";
    expect(isUxRedesignEnabled("UX_REDESIGN_ILLUSTRATIONS")).toBe(true);
  });
});
