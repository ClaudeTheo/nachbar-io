import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KiHelpPulseDot } from "@/components/ki-help/KiHelpPulseDot";

describe("KiHelpPulseDot — asButton-Modus", () => {
  afterEach(() => cleanup());

  it("rendert ohne asButton als dekoratives span (aria-hidden)", () => {
    render(<KiHelpPulseDot data-testid="dot" />);
    const node = screen.getByTestId("dot");
    expect(node.tagName).toBe("SPAN");
    expect(node).toHaveAttribute("aria-hidden", "true");
  });

  it("rendert mit asButton als <button> mit aria-label", () => {
    render(
      <KiHelpPulseDot
        asButton
        ariaLabel="Hilfe zur KI-Hilfe öffnen"
        data-testid="dot-btn"
      />,
    );
    const node = screen.getByTestId("dot-btn");
    expect(node.tagName).toBe("BUTTON");
    expect(node).toHaveAttribute("type", "button");
    expect(node).toHaveAttribute("aria-label", "Hilfe zur KI-Hilfe öffnen");
    expect(node).not.toHaveAttribute("aria-hidden");
  });

  it("ruft onClick im asButton-Modus auf", () => {
    const onClick = vi.fn();
    render(
      <KiHelpPulseDot
        asButton
        ariaLabel="Hilfe öffnen"
        onClick={onClick}
        data-testid="dot-btn"
      />,
    );
    fireEvent.click(screen.getByTestId("dot-btn"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("behaelt motion-safe-Klasse fuer prefers-reduced-motion (beide Modi)", () => {
    const { unmount } = render(<KiHelpPulseDot data-testid="dot" />);
    expect(screen.getByTestId("dot").innerHTML).toMatch(/motion-safe/);
    unmount();
    render(<KiHelpPulseDot asButton ariaLabel="x" data-testid="dot-btn" />);
    expect(screen.getByTestId("dot-btn").innerHTML).toMatch(/motion-safe/);
  });
});
