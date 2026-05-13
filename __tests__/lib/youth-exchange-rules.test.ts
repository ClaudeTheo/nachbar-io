import { describe, expect, it } from "vitest";

import {
  YOUTH_EXCHANGE_TYPES,
  isYouthExchangeType,
  youthExchangeAllowsMoney,
} from "@/modules/youth/services/exchange-rules";

describe("youth exchange rules", () => {
  it("erlaubt fuer Jugend nur Tauschen und Verschenken", () => {
    expect(YOUTH_EXCHANGE_TYPES.map((type) => type.id)).toEqual(["swap", "give"]);
    expect(isYouthExchangeType("swap")).toBe(true);
    expect(isYouthExchangeType("give")).toBe(true);
  });

  it("blockiert Verkauf, Verleihen und Suche aus der Jugend-Boerse", () => {
    expect(isYouthExchangeType("sell")).toBe(false);
    expect(isYouthExchangeType("lend")).toBe(false);
    expect(isYouthExchangeType("search")).toBe(false);
  });

  it("erlaubt keine Geldlogik in der Jugend-Boerse", () => {
    expect(youthExchangeAllowsMoney()).toBe(false);
  });
});
