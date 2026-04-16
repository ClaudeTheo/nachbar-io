import { describe, expect, it } from "vitest";

import {
  getMapPositionEmptyState,
  hasQuarterSvgMap,
} from "@/lib/map-position";

describe("hasQuarterSvgMap", () => {
  it("treats existing map house data as a usable SVG map", () => {
    expect(
      hasQuarterSvgMap({
        slug: "unexpected-quarter-slug",
        mapHouseCount: 12,
      }),
    ).toBe(true);
  });

  it("keeps legacy pilot slugs enabled even when map data is empty", () => {
    expect(hasQuarterSvgMap({ slug: "bad-saeckingen", mapHouseCount: 0 })).toBe(
      true,
    );
  });

  it("returns false for quarters without slug allowlist and without map data", () => {
    expect(hasQuarterSvgMap({ slug: "other-quarter", mapHouseCount: 0 })).toBe(
      false,
    );
  });
});

describe("getMapPositionEmptyState", () => {
  it("asks unauthenticated users to sign in", () => {
    expect(
      getMapPositionEmptyState({
        isAuthenticated: false,
        householdLinked: false,
      }),
    ).toEqual({
      title: "Anmeldung erforderlich",
      body: "Bitte melden Sie sich an, um Ihre Kartenposition zu bearbeiten.",
    });
  });

  it("explains when the linked address is not on the pilot map", () => {
    expect(
      getMapPositionEmptyState({
        isAuthenticated: true,
        householdLinked: true,
        addressLabel: "E2E-Testweg 1",
      }),
    ).toEqual({
      title: "Adresse noch nicht auf der Karte",
      body: "E2E-Testweg 1 ist auf der Quartierskarte noch nicht hinterlegt.",
    });
  });

  it("distinguishes linked households from missing household assignments", () => {
    expect(
      getMapPositionEmptyState({
        isAuthenticated: true,
        householdLinked: true,
      }),
    ).toEqual({
      title: "Haushalt noch nicht auf der Karte",
      body: "Ihr Haushalt ist verknüpft, auf der Kartenansicht aber noch nicht verfügbar.",
    });

    expect(
      getMapPositionEmptyState({
        isAuthenticated: true,
        householdLinked: false,
      }),
    ).toEqual({
      title: "Kein Haushalt zugeordnet",
      body: "Für dieses Konto ist aktuell kein verifizierter Haushalt hinterlegt.",
    });
  });
});
