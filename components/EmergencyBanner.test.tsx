// Nachbar.io — Tests fuer EmergencyBanner (KRITISCHE KOMPONENTE)
// Stellt sicher, dass 112/110 IMMER korrekt angezeigt werden
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { EmergencyBanner } from "./EmergencyBanner";

// Lucide-React Icons mocken (SVG-Rendering in jsdom)
vi.mock("lucide-react", () => ({
  Phone: (props: Record<string, unknown>) => <svg data-testid="phone-icon" {...props} />,
}));

afterEach(() => {
  cleanup();
});

describe("EmergencyBanner", () => {
  it("zeigt 'Notruf zuerst!' Ueberschrift", () => {
    render(<EmergencyBanner onAcknowledge={vi.fn()} />);
    expect(screen.getByText("Notruf zuerst!")).toBeInTheDocument();
  });

  it("zeigt tel:112 Link (Feuerwehr/Rettungsdienst)", () => {
    render(<EmergencyBanner onAcknowledge={vi.fn()} />);
    const link = screen.getByText(/112 — Feuerwehr/);
    expect(link.closest("a")).toHaveAttribute("href", "tel:112");
  });

  it("zeigt tel:110 Link (Polizei)", () => {
    render(<EmergencyBanner onAcknowledge={vi.fn()} />);
    const link = screen.getByText(/110 — Polizei/);
    expect(link.closest("a")).toHaveAttribute("href", "tel:110");
  });

  it("hat role='alertdialog' und aria-modal='true'", () => {
    const { container } = render(<EmergencyBanner onAcknowledge={vi.fn()} />);
    const dialog = container.querySelector("[role='alertdialog']");
    expect(dialog).not.toBeNull();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("hat aria-labelledby fuer die Ueberschrift", () => {
    const { container } = render(<EmergencyBanner onAcknowledge={vi.fn()} />);
    const dialog = container.querySelector("[role='alertdialog']");
    expect(dialog).toHaveAttribute("aria-labelledby", "emergency-title");
    const heading = screen.getByText("Notruf zuerst!");
    expect(heading.id).toBe("emergency-title");
  });

  it("ruft onAcknowledge bei Klick auf Weiter-Button auf", () => {
    const onAcknowledge = vi.fn();
    render(<EmergencyBanner onAcknowledge={onAcknowledge} />);

    const button = screen.getByText(/Nachbarn zusätzlich informieren/i);
    fireEvent.click(button);

    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });

  it("ruft onAcknowledge bei Escape-Taste auf", () => {
    const onAcknowledge = vi.fn();
    render(<EmergencyBanner onAcknowledge={onAcknowledge} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });

  it("zeigt den Hinweistext zum offiziellen Notruf", () => {
    render(<EmergencyBanner onAcknowledge={vi.fn()} />);
    expect(screen.getByText(/offiziellen Notruf/i)).toBeInTheDocument();
  });

  it("112 Link erscheint VOR dem 110 Link im DOM", () => {
    const { container } = render(<EmergencyBanner onAcknowledge={vi.fn()} />);
    const links = container.querySelectorAll("a[href^='tel:']");
    expect(links[0]).toHaveAttribute("href", "tel:112");
    expect(links[1]).toHaveAttribute("href", "tel:110");
  });
});
