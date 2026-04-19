// Tests fuer computeTileDisabled — entscheidet, ob eine Care-Hub-Kachel
// grau oder klickbar gerendert wird.
// Der Hub-Render-Test selbst laeuft als E2E (Task 8 im Plan).

import { describe, it, expect } from "vitest";
import { computeTileDisabled } from "@/lib/health-feature-gate";

// Legacy-Route-Stub: simuliert /praevention als einzige Legacy-Route fuer den Test.
const isLegacyStub = (p: string) => p === "/praevention";

describe("computeTileDisabled (Care-Hub-Kacheln)", () => {
  it("Health-Route mit Flag=true: enabled", () => {
    expect(
      computeTileDisabled(
        "/care/medications",
        { MEDICATIONS_ENABLED: true },
        isLegacyStub,
      ),
    ).toBe(false);
  });

  it("Health-Route mit Flag=false: disabled", () => {
    expect(
      computeTileDisabled(
        "/care/medications",
        { MEDICATIONS_ENABLED: false },
        isLegacyStub,
      ),
    ).toBe(true);
  });

  it("Health-Route ohne Flag-Daten (noch nicht geladen): disabled", () => {
    expect(computeTileDisabled("/care/medications", {}, isLegacyStub)).toBe(
      true,
    );
  });

  it("Legacy-Route (/praevention): immer disabled, auch ohne Flag", () => {
    expect(computeTileDisabled("/praevention", {}, isLegacyStub)).toBe(true);
  });

  it("Legacy-Route hat Vorrang vor Flag (falls je kombinierbar)", () => {
    expect(
      computeTileDisabled(
        "/praevention",
        { HEARTBEAT_ENABLED: true },
        isLegacyStub,
      ),
    ).toBe(true);
  });

  it("Alle 5 Health-Hub-Kacheln disabled bei leerem Flag-State", () => {
    const state = {};
    expect(computeTileDisabled("/care/checkin", state, isLegacyStub)).toBe(
      true,
    );
    expect(computeTileDisabled("/care/medications", state, isLegacyStub)).toBe(
      true,
    );
    expect(computeTileDisabled("/care/aerzte", state, isLegacyStub)).toBe(true);
    expect(computeTileDisabled("/care/termine", state, isLegacyStub)).toBe(
      true,
    );
    expect(computeTileDisabled("/care/sprechstunde", state, isLegacyStub)).toBe(
      true,
    );
  });

  it("Alle Health-Kacheln enabled wenn alle Flags true", () => {
    const state = {
      MEDICATIONS_ENABLED: true,
      DOCTORS_ENABLED: true,
      APPOINTMENTS_ENABLED: true,
      VIDEO_CONSULTATION: true,
      HEARTBEAT_ENABLED: true,
    };
    expect(computeTileDisabled("/care/checkin", state, isLegacyStub)).toBe(
      false,
    );
    expect(computeTileDisabled("/care/medications", state, isLegacyStub)).toBe(
      false,
    );
    expect(computeTileDisabled("/care/aerzte", state, isLegacyStub)).toBe(
      false,
    );
    expect(computeTileDisabled("/care/termine", state, isLegacyStub)).toBe(
      false,
    );
    expect(computeTileDisabled("/care/sprechstunde", state, isLegacyStub)).toBe(
      false,
    );
  });
});
