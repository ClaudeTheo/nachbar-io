// __tests__/lib/auth/sanitize-next-path.test.ts
// Schutz gegen Open-Redirect-Angriffe auf Login-Callbacks.

import { describe, it, expect } from "vitest";
import { sanitizeNextPath } from "@/lib/auth/sanitize-next-path";

describe("sanitizeNextPath", () => {
  it("erlaubt normale relative Pfade", () => {
    expect(sanitizeNextPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeNextPath("/senior/home")).toBe("/senior/home");
    expect(sanitizeNextPath("/profil/gedaechtnis")).toBe("/profil/gedaechtnis");
    expect(sanitizeNextPath("/admin?tab=users")).toBe("/admin?tab=users");
  });

  it("blockiert Protocol-Relative URLs (//evil.com)", () => {
    expect(sanitizeNextPath("//evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath("//evil.com/foo")).toBe("/dashboard");
    expect(sanitizeNextPath("//attacker.example.org")).toBe("/dashboard");
  });

  it("blockiert Backslash-Vektor (/\\evil.com)", () => {
    expect(sanitizeNextPath("/\\evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath("/\\\\evil.com")).toBe("/dashboard");
  });

  it("blockiert absolute URLs", () => {
    expect(sanitizeNextPath("https://evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath("http://evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath("javascript:alert(1)")).toBe("/dashboard");
    expect(sanitizeNextPath("data:text/html,<script>")).toBe("/dashboard");
  });

  it("blockiert relative Pfade ohne fuehrenden Slash", () => {
    expect(sanitizeNextPath("dashboard")).toBe("/dashboard");
    expect(sanitizeNextPath("evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath("../admin")).toBe("/dashboard");
  });

  it("nutzt Custom-Fallback wenn gegeben", () => {
    expect(sanitizeNextPath("//evil.com", "/after-login")).toBe("/after-login");
    expect(sanitizeNextPath(null, "/after-login")).toBe("/after-login");
    expect(sanitizeNextPath("https://evil.com", "/senior/home")).toBe("/senior/home");
  });

  it("faellt bei null/undefined/leer auf Default zurueck", () => {
    expect(sanitizeNextPath(null)).toBe("/dashboard");
    expect(sanitizeNextPath(undefined)).toBe("/dashboard");
    expect(sanitizeNextPath("")).toBe("/dashboard");
  });

  it("ist gegen typischen Angriff aus dem Audit gehaertet (?next=//evil.com/foo)", () => {
    // Vor dem Fix: NextResponse.redirect(`${origin}${next}`)
    //   = `https://nachbar-io.vercel.app//evil.com/foo`
    //   = Browser interpretiert als protocol-relative URL → evil.com/foo
    expect(sanitizeNextPath("//evil.com/foo")).toBe("/dashboard");
  });
});
