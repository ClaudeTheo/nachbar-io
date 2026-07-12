// Tests fuer die zentrale Stimmen-Zuordnung (Stimmen-Wechsel 2026-07):
// neue gpt-4o-mini-tts-Generation marin (weiblich) / cedar (maennlich),
// Alt-Werte nova/ash/onyx werden beim Lesen migriert.

import { describe, it, expect } from "vitest";
import {
  DEFAULT_VOICE,
  FEMALE_VOICE,
  MALE_VOICE,
  normalizeVoice,
} from "../voice-names";

describe("voice-names", () => {
  it("Default ist die neue weibliche Stimme marin", () => {
    expect(FEMALE_VOICE).toBe("marin");
    expect(MALE_VOICE).toBe("cedar");
    expect(DEFAULT_VOICE).toBe("marin");
  });

  it("migriert maennliche Alt-Werte auf cedar", () => {
    expect(normalizeVoice("ash")).toBe("cedar");
    expect(normalizeVoice("onyx")).toBe("cedar");
    expect(normalizeVoice("cedar")).toBe("cedar");
  });

  it("migriert weibliche/unbekannte Werte auf marin", () => {
    expect(normalizeVoice("nova")).toBe("marin");
    expect(normalizeVoice("marin")).toBe("marin");
    expect(normalizeVoice(undefined)).toBe("marin");
    expect(normalizeVoice("")).toBe("marin");
    expect(normalizeVoice(42)).toBe("marin");
  });
});
