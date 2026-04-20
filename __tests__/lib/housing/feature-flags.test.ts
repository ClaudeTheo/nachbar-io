// __tests__/lib/housing/feature-flags.test.ts
// Tests fuer A7: Housing-Feature-Flag-Helper mit Master x Teilfunktion-Logik.
//
// Mig 177 definiert 6 Flags:
//  - HOUSING_MODULE_ENABLED (Master)
//  - HOUSING_REPORTS, HOUSING_ANNOUNCEMENTS, HOUSING_DOCUMENTS,
//    HOUSING_APPOINTMENTS (Teilfunktionen, nur wirksam wenn Master true)
//  - HOUSING_SHADOW_QUARTER (unabhaengig, gehoert logisch zum Free-first-Pfad)
//
// Erwartetes Verhalten:
//  - Teilfunktion false wenn Master false, auch wenn Flag selbst true
//  - Teilfunktion false wenn Teilfunktion-Flag false, auch wenn Master true
//  - Master + HOUSING_SHADOW_QUARTER werden direkt geprueft (keine Meta-Logik)

import { describe, it, expect, vi, beforeEach } from "vitest";

// checkFeatureAccess aus lib/feature-flags mocken — steuerbarer Flag-Status
vi.mock("@/lib/feature-flags", () => ({
  checkFeatureAccess: vi.fn(),
}));

import { checkFeatureAccess } from "@/lib/feature-flags";
import { isHousingFeatureEnabled } from "@/lib/housing/feature-flags";
import type { UserContext } from "@/lib/feature-flags";

const user: UserContext = { role: "resident", plan: "free", quarter_id: "q-1" };

function setFlags(map: Record<string, boolean>) {
  (
    checkFeatureAccess as unknown as ReturnType<typeof vi.fn>
  ).mockImplementation(async (key: string) => map[key] ?? false);
}

describe("isHousingFeatureEnabled (A7 Master x Teilfunktion)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Master false → alle Teilfunktionen false (auch wenn Teilfunktion-Flag true)", async () => {
    setFlags({
      HOUSING_MODULE_ENABLED: false,
      HOUSING_REPORTS: true,
      HOUSING_ANNOUNCEMENTS: true,
    });

    expect(await isHousingFeatureEnabled("HOUSING_REPORTS", user)).toBe(false);
    expect(await isHousingFeatureEnabled("HOUSING_ANNOUNCEMENTS", user)).toBe(
      false,
    );
  });

  it("Master true + Teilfunktion true → true", async () => {
    setFlags({
      HOUSING_MODULE_ENABLED: true,
      HOUSING_REPORTS: true,
    });
    expect(await isHousingFeatureEnabled("HOUSING_REPORTS", user)).toBe(true);
  });

  it("Master true + Teilfunktion false → false", async () => {
    setFlags({
      HOUSING_MODULE_ENABLED: true,
      HOUSING_REPORTS: false,
    });
    expect(await isHousingFeatureEnabled("HOUSING_REPORTS", user)).toBe(false);
  });

  it("Master selbst → direkt geprueft, keine Meta-Logik", async () => {
    setFlags({ HOUSING_MODULE_ENABLED: true });
    expect(await isHousingFeatureEnabled("HOUSING_MODULE_ENABLED", user)).toBe(
      true,
    );
  });

  it("HOUSING_SHADOW_QUARTER ist unabhaengig vom Master", async () => {
    setFlags({
      HOUSING_MODULE_ENABLED: false,
      HOUSING_SHADOW_QUARTER: true,
    });
    expect(await isHousingFeatureEnabled("HOUSING_SHADOW_QUARTER", user)).toBe(
      true,
    );
  });

  it("Unbekannte Keys → false (kein Crash)", async () => {
    setFlags({});
    expect(
      // @ts-expect-error absichtlich falscher Key
      await isHousingFeatureEnabled("NICHT_EXISTENT", user),
    ).toBe(false);
  });
});
