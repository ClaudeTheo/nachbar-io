import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MapFilterBar } from "@/components/MapFilterBar";

describe("MapFilterBar", () => {
  const defaultCounts = { green: 3, red: 1, yellow: 2, blue: 0, orange: 0 };

  it("zeigt Quartier-Name an", () => {
    const { container } = render(
      <MapFilterBar counts={defaultCounts} filter="all" onFilterChange={vi.fn()} onReset={vi.fn()} quarterName="Laufenburg" />
    );
    expect(container.textContent).toContain("Laufenburg");
  });

  it("zeigt Farb-Filter mit Zahlen", () => {
    const { container } = render(
      <MapFilterBar counts={defaultCounts} filter="all" onFilterChange={vi.fn()} onReset={vi.fn()} quarterName="Test" />
    );
    expect(container.textContent).toContain("3 Okay");
    expect(container.textContent).toContain("1 SOS");
    expect(container.textContent).toContain("2 Hilfe");
  });

  it("versteckt Urlaub/Paket bei count=0", () => {
    const { container } = render(
      <MapFilterBar counts={defaultCounts} filter="all" onFilterChange={vi.fn()} onReset={vi.fn()} quarterName="Test" />
    );
    expect(container.textContent).not.toContain("Urlaub");
    expect(container.textContent).not.toContain("Paket");
  });

  it("ruft onFilterChange bei Klick auf", () => {
    const handler = vi.fn();
    const { container } = render(
      <MapFilterBar counts={defaultCounts} filter="all" onFilterChange={handler} onReset={vi.fn()} quarterName="Test" />
    );
    // Finde den Button mit "Okay" Text
    const buttons = container.querySelectorAll("button");
    const greenButton = Array.from(buttons).find(b => b.textContent?.includes("Okay"));
    expect(greenButton).toBeDefined();
    fireEvent.click(greenButton!);
    expect(handler).toHaveBeenCalledWith("green");
  });

  it("ruft onReset bei Reset-Klick auf", () => {
    const resetHandler = vi.fn();
    const { container } = render(
      <MapFilterBar counts={defaultCounts} filter="green" onFilterChange={vi.fn()} onReset={resetHandler} quarterName="Test" />
    );
    // Finde den Reset-Button
    const buttons = container.querySelectorAll("button");
    const resetButton = Array.from(buttons).find(b => b.textContent?.includes("Reset"));
    expect(resetButton).toBeDefined();
    fireEvent.click(resetButton!);
    expect(resetHandler).toHaveBeenCalled();
  });
});
