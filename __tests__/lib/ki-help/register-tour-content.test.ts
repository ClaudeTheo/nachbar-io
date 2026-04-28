import { describe, expect, it } from "vitest";
import type { Step } from "@/app/(auth)/register/components/types";
import {
  REGISTER_TOUR_HINTS,
  getRegisterTourHint,
} from "@/lib/ki-help/register-tour-content";

const steps: Step[] = [
  "entry",
  "invite_code",
  "address",
  "identity",
  "pilot_role",
  "ai_consent",
  "magic_link_sent",
];

describe("REGISTER_TOUR_HINTS", () => {
  it("has exactly one calm static hint for every register step", () => {
    expect(Object.keys(REGISTER_TOUR_HINTS).sort()).toEqual([...steps].sort());
    for (const step of steps) {
      expect(getRegisterTourHint(step).trim().length).toBeGreaterThan(20);
    }
  });

  it("does not claim live AI, voice, calls, or storage", () => {
    for (const hint of Object.values(REGISTER_TOUR_HINTS)) {
      expect(hint).not.toMatch(
        /OpenAI|Anthropic|Mistral|Live-KI|Vorlesen|Stimme|Audio|gesendet|gespeichert/i,
      );
    }
  });
});
