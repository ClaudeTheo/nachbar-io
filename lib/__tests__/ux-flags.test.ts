// Tests fuer UX-Redesign Feature-Flags
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isUxRedesignEnabled } from "@/lib/ux-flags";

describe("isUxRedesignEnabled", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("gibt true zurueck wenn Flag nicht gesetzt (Standard aktiv)", () => {
    delete process.env.NEXT_PUBLIC_UX_REDESIGN_NAV;
    expect(isUxRedesignEnabled("UX_REDESIGN_NAV")).toBe(true);
  });

  it("gibt true zurueck wenn Flag auf 'true' steht", () => {
    process.env.NEXT_PUBLIC_UX_REDESIGN_NAV = "true";
    expect(isUxRedesignEnabled("UX_REDESIGN_NAV")).toBe(true);
  });

  it("gibt false zurueck wenn Flag explizit auf 'false' steht (Rollback)", () => {
    process.env.NEXT_PUBLIC_UX_REDESIGN_NAV = "false";
    expect(isUxRedesignEnabled("UX_REDESIGN_NAV")).toBe(false);
  });

  it("funktioniert fuer ILLUSTRATIONS Flag", () => {
    delete process.env.NEXT_PUBLIC_UX_REDESIGN_ILLUSTRATIONS;
    expect(isUxRedesignEnabled("UX_REDESIGN_ILLUSTRATIONS")).toBe(true);
    process.env.NEXT_PUBLIC_UX_REDESIGN_ILLUSTRATIONS = "false";
    expect(isUxRedesignEnabled("UX_REDESIGN_ILLUSTRATIONS")).toBe(false);
  });

  it("haelt Generation Design V2 fuer echte Routen standardmaessig aus", () => {
    delete process.env.NEXT_PUBLIC_UX_GENERATION_DESIGN_V2;
    expect(isUxRedesignEnabled("UX_GENERATION_DESIGN_V2")).toBe(false);
    process.env.NEXT_PUBLIC_UX_GENERATION_DESIGN_V2 = "true";
    expect(isUxRedesignEnabled("UX_GENERATION_DESIGN_V2")).toBe(true);
    process.env.NEXT_PUBLIC_UX_GENERATION_DESIGN_V2 = "false";
    expect(isUxRedesignEnabled("UX_GENERATION_DESIGN_V2")).toBe(false);
  });
});
