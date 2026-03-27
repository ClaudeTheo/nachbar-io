// Nachbar.io — Tests für EmergencyBanner (KRITISCHE KOMPONENTE, FMEA FM-NB-02)
// Stellt sicher, dass 112/110 IMMER korrekt angezeigt werden
// und Banner NICHT ohne explizite Bestätigung geschlossen werden kann
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
  it("zeigt 'Wichtiger Hinweis' Überschrift", () => {
    render(<EmergencyBanner onAcknowledge={vi.fn()} />);
    expect(screen.getByText("Wichtiger Hinweis")).toBeInTheDocument();
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

  it("hat aria-labelledby für die Überschrift", () => {
    const { container } = render(<EmergencyBanner onAcknowledge={vi.fn()} />);
    const dialog = container.querySelector("[role='alertdialog']");
    expect(dialog).toHaveAttribute("aria-labelledby", "emergency-title");
    const heading = screen.getByText("Wichtiger Hinweis");
    expect(heading.id).toBe("emergency-title");
  });

  it("ruft onAcknowledge(true) bei Klick auf 'Notruf angerufen'-Button auf", () => {
    const onAcknowledge = vi.fn();
    render(<EmergencyBanner onAcknowledge={onAcknowledge} />);

    const button = screen.getByText(/Ich habe 112\/110 angerufen/i);
    fireEvent.click(button);

    expect(onAcknowledge).toHaveBeenCalledTimes(1);
    expect(onAcknowledge).toHaveBeenCalledWith(true);
  });

  it("ruft onAcknowledge(false) bei Klick auf 'Kein Notruf'-Button auf", () => {
    const onAcknowledge = vi.fn();
    render(<EmergencyBanner onAcknowledge={onAcknowledge} />);

    const button = screen.getByText(/Kein Notruf nötig/i);
    fireEvent.click(button);

    expect(onAcknowledge).toHaveBeenCalledTimes(1);
    expect(onAcknowledge).toHaveBeenCalledWith(false);
  });

  it("blockiert Escape-Taste (FMEA FM-NB-02: Banner darf nicht einfach geschlossen werden)", () => {
    const onAcknowledge = vi.fn();
    render(<EmergencyBanner onAcknowledge={onAcknowledge} />);

    fireEvent.keyDown(document, { key: "Escape" });

    // Escape darf NICHT onAcknowledge aufrufen
    expect(onAcknowledge).not.toHaveBeenCalled();
  });

  it("zeigt den Hinweistext zur Nachbarschaftshilfe", () => {
    render(<EmergencyBanner onAcknowledge={vi.fn()} />);
    const matches = screen.getAllByText(/Nachbarschaftshilfe/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("112 Link erscheint VOR dem 110 Link im DOM", () => {
    const { container } = render(<EmergencyBanner onAcknowledge={vi.fn()} />);
    const links = container.querySelectorAll("a[href^='tel:']");
    expect(links[0]).toHaveAttribute("href", "tel:112");
    expect(links[1]).toHaveAttribute("href", "tel:110");
  });
});
