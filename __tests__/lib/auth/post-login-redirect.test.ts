// __tests__/lib/auth/post-login-redirect.test.ts
// Task B-4: Login-Redirect auf /kreis-start fuer Senior-UI-Modus.
// Reine Helper-Funktion, die anhand des ui_mode den Ziel-Pfad nach
// erfolgreichem Login bestimmt.

import { describe, it, expect } from "vitest";
import {
  resolvePostLoginPath,
  resolveSafeRedirectPath,
} from "@/lib/auth/post-login-redirect";

describe("resolvePostLoginPath (B-4)", () => {
  it("nimmt einen internen next-Pfad unveraendert", () => {
    expect(
      resolveSafeRedirectPath("/hausverwaltung/einladen?foo=bar", "/after-login"),
    ).toBe("/hausverwaltung/einladen?foo=bar");
  });

  it("faellt bei externem next-Pfad auf Fallback zurueck", () => {
    expect(
      resolveSafeRedirectPath("https://evil.example/steal", "/after-login"),
    ).toBe("/after-login");
    expect(resolveSafeRedirectPath("//evil.example", "/after-login")).toBe(
      "/after-login",
    );
  });

  it("sendet Senioren auf /kreis-start (4-Kachel-Startscreen aus B-2)", () => {
    expect(resolvePostLoginPath("senior")).toBe("/kreis-start");
  });

  it("sendet aktive Nutzer auf /dashboard", () => {
    expect(resolvePostLoginPath("active")).toBe("/dashboard");
  });

  it("faellt bei fehlendem ui_mode auf /dashboard zurueck", () => {
    expect(resolvePostLoginPath(null)).toBe("/dashboard");
    expect(resolvePostLoginPath(undefined)).toBe("/dashboard");
  });
});
