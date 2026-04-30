import { describe, expect, it } from "vitest";
import {
  FEATURE_FLAG_PHASE_CONFIRM_WORDS,
  FEATURE_FLAG_PHASE_PRESETS,
  KNOWN_FEATURE_FLAGS,
  PHASE_2A_AFTER_HR_FLAGS,
  PHASE_2B_AFTER_AI_AVV_FLAGS,
  PHASE_2C_AFTER_TWILIO_AVV_FLAGS,
  PHASE_2D_AFTER_CARE_AVV_FLAGS,
  PHASE_2E_AFTER_DOCTOR_CONTRACT_FLAGS,
  PHASE_2_OFF_FLAGS,
} from "@/lib/feature-flags-presets";

describe("feature flag phase presets", () => {
  it("enthaelt BILLING_ENABLED in den Phase-2a-HR-Flags", () => {
    expect(PHASE_2A_AFTER_HR_FLAGS).toContain("BILLING_ENABLED");
  });

  it("enthaelt AI_PROVIDER_CLAUDE in den Phase-2b-KI-AVV-Flags", () => {
    expect(PHASE_2B_AFTER_AI_AVV_FLAGS).toContain("AI_PROVIDER_CLAUDE");
  });

  it("stellt acht Phase-Presets bereit", () => {
    expect(Object.keys(FEATURE_FLAG_PHASE_PRESETS).sort()).toEqual([
      "phase_0",
      "phase_1",
      "phase_2",
      "phase_2a",
      "phase_2b",
      "phase_2c",
      "phase_2d",
      "phase_2e",
    ]);
  });

  it("deckt jede Phase mit einem Confirm-Wort ab", () => {
    expect(Object.keys(FEATURE_FLAG_PHASE_CONFIRM_WORDS).sort()).toEqual(
      Object.keys(FEATURE_FLAG_PHASE_PRESETS).sort(),
    );
  });

  it("kennt alle Phase-2-Flags auch in KNOWN_FEATURE_FLAGS", () => {
    const knownFlags = new Set(KNOWN_FEATURE_FLAGS);
    const phase2Flags = [
      ...PHASE_2A_AFTER_HR_FLAGS,
      ...PHASE_2B_AFTER_AI_AVV_FLAGS,
      ...PHASE_2C_AFTER_TWILIO_AVV_FLAGS,
      ...PHASE_2D_AFTER_CARE_AVV_FLAGS,
      ...PHASE_2E_AFTER_DOCTOR_CONTRACT_FLAGS,
      ...PHASE_2_OFF_FLAGS,
    ];

    expect(phase2Flags.filter((flag) => !knownFlags.has(flag))).toEqual([]);
  });
});
