import { describe, expect, it } from "vitest";
import {
  isClosedPilotPublicApiPath,
  isClosedPilotPublicPath,
} from "@/lib/closed-pilot";

describe("closed pilot public paths", () => {
  it("keeps the Open Graph image route public", () => {
    expect(isClosedPilotPublicPath("/opengraph-image")).toBe(true);
  });

  it.each(["/login", "/register", "/auth/callback", "/freigabe-ausstehend"])(
    "keeps auth and approval route %s public",
    (path) => {
      expect(isClosedPilotPublicPath(path)).toBe(true);
    },
  );

  it("keeps registration APIs public for pending onboarding", () => {
    expect(isClosedPilotPublicApiPath("/api/register/check-invite")).toBe(true);
    expect(isClosedPilotPublicApiPath("/api/register/complete")).toBe(true);
    expect(isClosedPilotPublicApiPath("/api/messages")).toBe(false);
  });
});
