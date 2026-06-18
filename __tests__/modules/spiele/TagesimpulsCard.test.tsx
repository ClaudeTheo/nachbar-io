import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TagesimpulsCard } from "@/modules/spiele/components/TagesimpulsCard";

afterEach(() => cleanup());

describe("TagesimpulsCard", () => {
  it("zeigt die Tagesimpuls-Karte mit dem Tagesrätsel", () => {
    render(<TagesimpulsCard />);
    expect(screen.getByText("Tagesimpuls")).toBeInTheDocument();
    expect(screen.getByTestId("tagesraetsel")).toBeInTheDocument();
    expect(screen.getAllByTestId("raetsel-option").length).toBeGreaterThan(0);
  });

  it("failureFree: markiert nach einer Antwort NICHTS als falsch + sanfte Story", () => {
    render(<TagesimpulsCard failureFree />);
    fireEvent.click(screen.getAllByTestId("raetsel-option")[0]);
    const states = screen
      .getAllByTestId("raetsel-option")
      .map((o) => o.getAttribute("data-state"));
    expect(states).not.toContain("wrong");
    expect(screen.getByTestId("raetsel-story").textContent).toContain(
      "Interessant!",
    );
  });

  it("Standard-Modus (failureFree=false): Story ohne Interessant-Vorspann", () => {
    render(<TagesimpulsCard failureFree={false} />);
    fireEvent.click(screen.getAllByTestId("raetsel-option")[0]);
    expect(screen.getByTestId("raetsel-story").textContent).not.toContain(
      "Interessant!",
    );
  });
});
