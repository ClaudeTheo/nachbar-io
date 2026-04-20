import { describe, it, expect } from "vitest";
import {
  SHADOW_QUARTER_ID,
  isShadowQuarter,
  quarterDisplayName,
  resolveQuarterIdOrShadow,
} from "@/lib/quarter-shadow";

describe("Schatten-Quartier Helper (Mig 175)", () => {
  it("SHADOW_QUARTER_ID ist die fixe Seed-UUID aus Mig 175", () => {
    expect(SHADOW_QUARTER_ID).toBe("00000000-0000-0000-0000-000000000001");
  });

  describe("isShadowQuarter", () => {
    it("true fuer die Schatten-UUID", () => {
      expect(isShadowQuarter(SHADOW_QUARTER_ID)).toBe(true);
    });

    it("false fuer eine andere UUID", () => {
      expect(isShadowQuarter("11111111-1111-1111-1111-111111111111")).toBe(
        false,
      );
    });

    it("false fuer null", () => {
      expect(isShadowQuarter(null)).toBe(false);
    });

    it("false fuer undefined", () => {
      expect(isShadowQuarter(undefined)).toBe(false);
    });
  });

  describe("quarterDisplayName", () => {
    it("maskiert Schatten-Quartier als 'Ohne Quartier'", () => {
      expect(quarterDisplayName(SHADOW_QUARTER_ID, "Offenes Quartier")).toBe(
        "Ohne Quartier",
      );
    });

    it("gibt echten Namen zurueck fuer echte Quartiere", () => {
      expect(
        quarterDisplayName(
          "22222222-2222-2222-2222-222222222222",
          "Bad Saeckingen",
        ),
      ).toBe("Bad Saeckingen");
    });

    it("maskiert auch wenn realName irrefuehrend gesetzt ist", () => {
      // Schutz gegen Fehlkonfiguration
      expect(quarterDisplayName(SHADOW_QUARTER_ID, "Irgendwas")).toBe(
        "Ohne Quartier",
      );
    });
  });

  describe("resolveQuarterIdOrShadow", () => {
    it("gibt gewaehltes Quartier zurueck wenn gesetzt", () => {
      const real = "22222222-2222-2222-2222-222222222222";
      expect(resolveQuarterIdOrShadow(real)).toBe(real);
    });

    it("gibt Schatten-Quartier bei null", () => {
      expect(resolveQuarterIdOrShadow(null)).toBe(SHADOW_QUARTER_ID);
    });

    it("gibt Schatten-Quartier bei undefined", () => {
      expect(resolveQuarterIdOrShadow(undefined)).toBe(SHADOW_QUARTER_ID);
    });
  });
});
