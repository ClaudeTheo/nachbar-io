import { describe, expect, it } from "vitest";
import { isClosedPilotPublicPath } from "@/lib/closed-pilot";

describe("closed pilot public paths", () => {
  it("keeps the Open Graph image route public", () => {
    expect(isClosedPilotPublicPath("/opengraph-image")).toBe(true);
  });
});
