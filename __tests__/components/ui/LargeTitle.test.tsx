import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { LargeTitle } from "@/components/ui/LargeTitle";

// IntersectionObserver ist in jsdom nicht verfuegbar
beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    constructor(private callback: IntersectionObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
});

afterEach(() => cleanup());

describe("LargeTitle", () => {
  it("rendert den Titel-Text", () => {
    render(<LargeTitle title="Zuhause" />);
    // Titel erscheint zweimal: kollabierter Header + grosser Titel
    const titles = screen.getAllByText("Zuhause");
    expect(titles.length).toBe(2);
  });

  it("rendert optionalen Untertitel", () => {
    render(<LargeTitle title="Zuhause" subtitle="Bad Saeckingen" />);
    expect(screen.getByText("Bad Saeckingen")).toBeInTheDocument();
  });

  it("rendert ohne Untertitel", () => {
    render(<LargeTitle title="Marktplatz" />);
    expect(
      screen.queryByTestId("large-title-subtitle"),
    ).not.toBeInTheDocument();
  });

  it("hat sticky Container", () => {
    render(<LargeTitle title="Test" />);
    const container = screen.getByTestId("large-title-container");
    expect(container).toBeInTheDocument();
  });
});
