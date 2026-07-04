import { describe, expect, it } from "vitest";

import {
  GENERATION_DESIGN,
  GENERATION_DESIGN_MODES,
  getGenerationDesign,
} from "@/lib/generation-design";
import { USER_UI_MODES } from "@/lib/user-modes";

describe("GENERATION_DESIGN", () => {
  it("enthaelt genau die vier bestehenden ui modes", () => {
    expect(GENERATION_DESIGN_MODES).toEqual(USER_UI_MODES);
    expect(Object.keys(GENERATION_DESIGN)).toEqual(USER_UI_MODES);
  });

  it("setzt Aktiv und Aktiv 55+ als Pilot-Prioritaet", () => {
    expect(getGenerationDesign("active").priority).toBe("pilot-primary");
    expect(getGenerationDesign("comfort").priority).toBe("pilot-primary");
    expect(getGenerationDesign("active").preview.headline).toMatch(/Heute/i);
    expect(getGenerationDesign("comfort").preview.headline).toMatch(/Ruhig/i);
  });

  it("parkt Jugend als Preview mit read-only Community-XP", () => {
    const youth = getGenerationDesign("youth");

    expect(youth.priority).toBe("preview-only");
    expect(youth.communityXp?.status).toBe("ui-only-read-only");
    expect(youth.guardrails.join(" ")).toMatch(/Keine Ranglisten/i);
    expect(youth.guardrails.join(" ")).toMatch(/Keine Streaks/i);
    expect(youth.guardrails.join(" ")).toMatch(/Keine Geldlogik/i);
    expect(youth.forbiddenPatterns).toEqual([
      "leaderboard",
      "streak",
      "cashout",
    ]);
  });

  it("schuetzt Senior-Flaechen mit klaren Notfall-Grenzen", () => {
    const senior = getGenerationDesign("senior");

    expect(senior.priority).toBe("protected");
    expect(senior.motion).toBe("still");
    expect(senior.guardrails.join(" ")).toMatch(/SOS byte-identisch/i);
    expect(senior.preview.metricValue).toBe("80 px");
  });

  it("stellt fuer jeden Modus vollstaendige Token bereit", () => {
    for (const mode of GENERATION_DESIGN_MODES) {
      const design = getGenerationDesign(mode);

      expect(design.containerClass).toContain("border");
      expect(design.tileClass).toContain("border");
      expect(design.accentClass.length).toBeGreaterThan(8);
      expect(design.focus).toHaveLength(3);
      expect(design.guardrails).toHaveLength(3);
      expect(design.preview.subline.length).toBeGreaterThan(20);
    }
  });
});
