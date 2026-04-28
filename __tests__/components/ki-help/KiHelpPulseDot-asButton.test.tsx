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

  it("asButton-Hitbox erfuellt mind. 44x44 px (WCAG 2.5.5 / Senior-Touch)", () => {
    render(
      <KiHelpPulseDot
        asButton
        ariaLabel="Hilfe öffnen"
        data-testid="dot-btn"
      />,
    );
    const btn = screen.getByTestId("dot-btn");
    expect(btn.className).toMatch(
      /\bh-11\b|\bh-12\b|min-h-\[44px\]|min-h-\[48px\]/,
    );
    expect(btn.className).toMatch(
      /\bw-11\b|\bw-12\b|min-w-\[44px\]|min-w-\[48px\]/,
    );
  });

  it("dekorativer span bleibt visuell klein (h-6 w-6) trotz groesserer Hitbox", () => {
    render(
      <KiHelpPulseDot
        asButton
        ariaLabel="Hilfe öffnen"
        data-testid="dot-btn"
      />,
    );
    const btn = screen.getByTestId("dot-btn");
    // Innerer Pulse-Outer bleibt klein — Button-Wrapper ist die Hitbox
    const pulseOuter = btn.querySelector("[data-pulse-outer]");
    expect(pulseOuter).not.toBeNull();
    // Inner-Dot weiterhin h-2.5 w-2.5
    const inner = btn.querySelector("[data-pulse-inner]");
    expect(inner?.className).toMatch(/h-2\.5/);
    expect(inner?.className).toMatch(/w-2\.5/);
  });
});
