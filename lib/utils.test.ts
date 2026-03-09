// Nachbar.io — Tests fuer Utility-Funktionen
import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("verbindet einfache Klassennamen", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("loest Tailwind-Konflikte auf (letzter gewinnt)", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("ignoriert undefined und null", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });

  it("handhabt leere Eingaben", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
  });

  it("unterstuetzt bedingte Klassen via clsx", () => {
    expect(cn("base", true && "active", false && "hidden")).toBe("base active");
  });
});
