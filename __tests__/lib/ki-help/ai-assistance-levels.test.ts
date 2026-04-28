import { describe, expect, it } from "vitest";
import {
  AI_ASSISTANCE_LEVELS,
  LEVEL_OPTIONS,
  deriveEnabledFromLevel,
  getLevelOptionsForMode,
  isActiveAiAssistanceLevel,
  isAiAssistanceLevel,
  levelToConsentChoice,
} from "@/lib/ki-help/ai-assistance-levels";

describe("ai-assistance-levels", () => {
  it("defines the four persisted levels", () => {
    expect(AI_ASSISTANCE_LEVELS).toEqual([
      "off",
      "basic",
      "everyday",
      "later",
    ]);
  });

  it("provides stable labels and mode filters", () => {
    expect(LEVEL_OPTIONS.map((option) => option.level)).toEqual([
      "off",
      "basic",
      "everyday",
      "later",
    ]);
    expect(getLevelOptionsForMode("onboarding").map((option) => option.level))
      .toEqual(["off", "basic", "everyday", "later"]);
    expect(getLevelOptionsForMode("settings").map((option) => option.level))
      .toEqual(["off", "basic", "everyday"]);
  });

  it("derives enabled state only for active levels", () => {
    expect(deriveEnabledFromLevel("off")).toBe(false);
    expect(deriveEnabledFromLevel("later")).toBe(false);
    expect(deriveEnabledFromLevel("basic")).toBe(true);
    expect(deriveEnabledFromLevel("everyday")).toBe(true);
  });

  it("guards arbitrary input", () => {
    expect(isAiAssistanceLevel("basic")).toBe(true);
    expect(isAiAssistanceLevel("personal")).toBe(false);
    expect(isAiAssistanceLevel(["basic"])).toBe(false);
  });

  it("maps onboarding consent choices consistently", () => {
    expect(levelToConsentChoice("off")).toBe("no");
    expect(levelToConsentChoice("basic")).toBe("yes");
    expect(levelToConsentChoice("everyday")).toBe("yes");
    expect(levelToConsentChoice("later")).toBe("later");
  });

  it("marks only basis and everyday as active AI levels", () => {
    expect(isActiveAiAssistanceLevel("off")).toBe(false);
    expect(isActiveAiAssistanceLevel("later")).toBe(false);
    expect(isActiveAiAssistanceLevel("basic")).toBe(true);
    expect(isActiveAiAssistanceLevel("everyday")).toBe(true);
  });
});
