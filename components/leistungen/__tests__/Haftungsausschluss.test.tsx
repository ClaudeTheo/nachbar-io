import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Haftungsausschluss } from "../Haftungsausschluss";

describe("Haftungsausschluss", () => {
  afterEach(() => cleanup());

  it("zeigt Disclaimer-Text und Stand-Datum", () => {
    render(<Haftungsausschluss country="DE" lastReviewed="2026-04-18" />);
    expect(screen.getByText(/Keine Rechtsberatung/i)).toBeDefined();
    expect(screen.getByText(/18\.4\.2026|18\.04\.2026/)).toBeDefined();
  });

  it("verweist auf Pflegekasse bei country=DE", () => {
    render(<Haftungsausschluss country="DE" lastReviewed="2026-04-18" />);
    expect(screen.getByText(/Pflegekasse/i)).toBeDefined();
  });

  it("verweist auf Ausgleichskasse bei country=CH", () => {
    render(<Haftungsausschluss country="CH" lastReviewed="2026-04-18" />);
    expect(screen.getByText(/Ausgleichskasse|IV-Stelle/i)).toBeDefined();
  });

  it("hat role=note fuer Screenreader", () => {
    render(<Haftungsausschluss country="DE" lastReviewed="2026-04-18" />);
    expect(screen.getByRole("note")).toBeDefined();
  });
});
