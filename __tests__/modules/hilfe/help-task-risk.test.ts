import { describe, expect, it } from "vitest";
import {
  classifyHelpTaskRisk,
  getMinorHelpDecision,
} from "@/modules/hilfe/services/help-task-risk";

describe("help task risk", () => {
  it("erkennt niedrig-riskante Aufgaben fuer Jugendliche", () => {
    expect(
      classifyHelpTaskRisk({ category: "tech", subcategory: "phone_help" }),
    ).toMatchObject({
      risk: "low",
      minorEligible: true,
    });
  });

  it("blockiert Rasenmaehen fuer Minderjaehrige", () => {
    expect(
      classifyHelpTaskRisk({ category: "garden", subcategory: "mowing" }),
    ).toMatchObject({
      risk: "medium",
      minorEligible: false,
    });
  });

  it("blockiert elektrische Handwerksarbeiten", () => {
    expect(
      classifyHelpTaskRisk({ category: "handwork", subcategory: "electrical" }),
    ).toMatchObject({
      risk: "blocked_for_minors",
      minorEligible: false,
    });
  });

  it("blockiert Aufgabenannahme fuer U13 immer", () => {
    const decision = getMinorHelpDecision({
      age: 12,
      hasGuardianConsent: true,
      category: "tech",
      subcategory: "phone_help",
      recognitionType: "free",
      estimatedDurationMinutes: 30,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("unter 13");
  });

  it("erlaubt U18 nur kostenlos, niedrig-riskant und mit Elternfreigabe", () => {
    expect(
      getMinorHelpDecision({
        age: 15,
        hasGuardianConsent: false,
        category: "tech",
        subcategory: "phone_help",
        recognitionType: "free",
      }).allowed,
    ).toBe(false);

    expect(
      getMinorHelpDecision({
        age: 15,
        hasGuardianConsent: true,
        category: "tech",
        subcategory: "phone_help",
        recognitionType: "suggested_amount",
      }).allowed,
    ).toBe(false);

    expect(
      getMinorHelpDecision({
        age: 15,
        hasGuardianConsent: true,
        category: "tech",
        subcategory: "phone_help",
        recognitionType: "free",
        estimatedDurationMinutes: 60,
      }).allowed,
    ).toBe(true);
  });
});
