import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QuickActions } from "@/components/dashboard/QuickActions";

afterEach(cleanup);

describe("QuickActions Plain Layout", () => {
  it("rendert 4-Spalten-Grid", () => {
    render(<QuickActions />);
    const section = screen.getByTestId("quick-actions");
    const grid = section.querySelector("[class*='grid-cols-4']");
    expect(grid).toBeInTheDocument();
  });

  it("hat keine shadow Klassen auf Items", () => {
    render(<QuickActions />);
    const links = screen.getByTestId("quick-actions").querySelectorAll("a");
    links.forEach((link) => {
      expect(link.className).not.toContain("shadow-soft");
      expect(link.className).not.toContain("shadow-lg");
    });
  });

  it("hat vertikales Layout (Icon oben, Label unten)", () => {
    render(<QuickActions />);
    const links = screen.getByTestId("quick-actions").querySelectorAll("a");
    links.forEach((link) => {
      expect(link.className).toContain("flex-col");
    });
  });
});
