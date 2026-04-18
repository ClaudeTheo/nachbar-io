import { describe, it, expect } from "vitest";
import { resolveCountryFromQuarter } from "../get-country";

describe("resolveCountryFromQuarter", () => {
  it('gibt DE zurueck wenn Quartier country="DE"', () => {
    expect(resolveCountryFromQuarter({ country: "DE", state: "BW" })).toBe(
      "DE",
    );
  });

  it('gibt CH zurueck wenn Quartier country="CH"', () => {
    expect(resolveCountryFromQuarter({ country: "CH", state: "AG" })).toBe(
      "CH",
    );
  });

  it("Fallback DE bei NULL country", () => {
    expect(resolveCountryFromQuarter({ country: null, state: null })).toBe(
      "DE",
    );
  });

  it("Fallback DE bei unbekannten Werten (nicht DE/CH)", () => {
    expect(resolveCountryFromQuarter({ country: "AT", state: null })).toBe(
      "DE",
    );
  });

  it("gibt DE zurueck wenn Quartier gar nicht vorhanden", () => {
    expect(resolveCountryFromQuarter(null)).toBe("DE");
  });
});
