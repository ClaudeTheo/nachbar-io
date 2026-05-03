// __tests__/components/AuthSessionProvider.test.ts
// Lokale UI-Previews duerfen clientseitig nicht zum Login umgeleitet werden.

import { describe, expect, it } from "vitest";
import { isAuthSessionPublicPath } from "@/components/AuthSessionProvider";

describe("isAuthSessionPublicPath", () => {
  it.each(["/senior/preview", "/care/preview", "/care/consent/preview"])(
    "behandelt %s als oeffentlichen Preview-Pfad",
    (path) => {
      expect(isAuthSessionPublicPath(path)).toBe(true);
    },
  );
});
