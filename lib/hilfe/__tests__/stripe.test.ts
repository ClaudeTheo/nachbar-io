import { describe, it, expect } from "vitest";
import { HILFE_SUBSCRIPTION_AMOUNT_CENTS, formatEuroCents } from "../stripe";

describe("stripe helpers", () => {
  it("has correct subscription amount", () => {
    expect(HILFE_SUBSCRIPTION_AMOUNT_CENTS).toBe(1990);
  });

  it("formats cents to EUR string", () => {
    expect(formatEuroCents(1990)).toBe("19,90 EUR");
    expect(formatEuroCents(0)).toBe("0,00 EUR");
    expect(formatEuroCents(100)).toBe("1,00 EUR");
    expect(formatEuroCents(13100)).toBe("131,00 EUR");
  });
});
