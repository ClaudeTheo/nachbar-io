// __tests__/lib/auth/post-login-redirect.test.ts
// Task B-4: Login-Redirect auf /kreis-start fuer Senior-UI-Modus.
// Reine Helper-Funktion, die anhand des ui_mode den Ziel-Pfad nach
// erfolgreichem Login bestimmt.

import { describe, it, expect } from "vitest";
import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect";

describe("resolvePostLoginPath (B-4)", () => {
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
