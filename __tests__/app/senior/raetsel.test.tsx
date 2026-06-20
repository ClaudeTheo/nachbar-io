// __tests__/app/senior/raetsel.test.tsx — Welle SP1-3
// Smoke: die Senior-Tagesrätsel-Seite rendert failure-free mit echten Daten
// (Service + Datendatei) ohne Auth/Supabase.

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import SeniorRaetselPage from "@/app/(senior)/raetsel/page";

describe("SeniorRaetselPage (SP1-3)", () => {
  afterEach(cleanup);

  it("zeigt die Tagesrätsel-Überschrift und eine Frage mit vier Optionen", () => {
    render(<SeniorRaetselPage />);
    expect(screen.getByText(/Tagesrätsel — kleine Denkpause/)).toBeDefined();
    const options = screen.getAllByTestId("raetsel-option");
    expect(options).toHaveLength(4);
    // Senior-Touch-Target
    expect(options[0].getAttribute("style") ?? "").toContain("80px");
  });

  it("öffnet failure-free nach jeder Antwort die Geschichte ohne Falsch-Markierung", () => {
    render(<SeniorRaetselPage />);
    fireEvent.click(screen.getAllByTestId("raetsel-option")[0]);
    expect(screen.getByTestId("raetsel-story")).toBeDefined();
    const states = screen
      .getAllByTestId("raetsel-option")
      .map((b) => b.getAttribute("data-state"));
    expect(states).not.toContain("wrong");
  });
});
