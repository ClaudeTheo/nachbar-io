import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KiHelpPulseDot } from "@/components/ki-help/KiHelpPulseDot";

describe("KiHelpPulseDot", () => {
  afterEach(() => cleanup());

  it("rendert ein dekoratives Element ohne semantische Bedeutung", () => {
    render(<KiHelpPulseDot data-testid="dot" />);
    const node = screen.getByTestId("dot");
    expect(node).toBeInTheDocument();
    expect(node).toHaveAttribute("aria-hidden", "true");
  });

  it("traegt eine motion-aware Klasse fuer prefers-reduced-motion", () => {
    render(<KiHelpPulseDot data-testid="dot" />);
    const node = screen.getByTestId("dot");
    // The pulsing inner halo lives inside; check the class somewhere in subtree.
    expect(node.innerHTML).toMatch(/motion-safe/);
  });

  it("hat einen quartier-green Innenkreis", () => {
    const { container } = render(<KiHelpPulseDot />);
    const inner = container.querySelector("[data-pulse-inner]");
    expect(inner).not.toBeNull();
    expect(inner?.className).toMatch(/bg-quartier-green/);
  });
});
