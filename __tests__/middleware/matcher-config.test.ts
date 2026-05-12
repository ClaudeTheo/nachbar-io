// Sicherstellt, dass der Next.js-Middleware-Matcher die statischen
// Asset-Pfade vom Proxy ausschliesst — sonst 307-Redirect der Bilder
// im Closed-Pilot-Mode (Founder-Befund 2026-05-12: hero-quartier.webp
// wurde mit 307 zurueckgegeben, weil /images/ nicht in der Negativliste war).

import { describe, expect, it } from "vitest";

import { config } from "@/proxy";

describe("Proxy-Matcher (Negativliste statischer Assets)", () => {
  const matcherEntry = config.matcher[0] as string;

  it("schliesst /brand/ aus (Aquarell-Logo + Symbol)", () => {
    expect(matcherEntry).toContain("brand/");
  });

  it("schliesst /images/ aus (Hero-Quartier-Foto fuer App-Shell-BG)", () => {
    expect(matcherEntry).toContain("images/");
  });

  it("schliesst Next-internals (_next/static, _next/image) aus", () => {
    expect(matcherEntry).toContain("_next/static");
    expect(matcherEntry).toContain("_next/image");
  });
});
