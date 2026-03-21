import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GuidelinesAcceptance } from "@/components/moderation/GuidelinesAcceptance";

// Mock useGuidelinesAccepted Hook
const mockAcceptGuidelines = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/hooks/useGuidelinesAccepted", () => ({
  useGuidelinesAccepted: () => ({
    accepted: false,
    loading: false,
    acceptGuidelines: mockAcceptGuidelines,
  }),
}));

describe("GuidelinesAcceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("rendert Dialog mit Titel und Zusammenfassung", () => {
    render(<GuidelinesAcceptance onAccepted={vi.fn()} />);
    expect(screen.getByText("Community-Richtlinien")).toBeTruthy();
    expect(screen.getByText(/Respektvoller, ehrlicher/)).toBeTruthy();
    expect(screen.getByText(/Keine Hassrede/)).toBeTruthy();
  });

  it("hat aria-modal und role=dialog", () => {
    render(<GuidelinesAcceptance onAccepted={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("Button ist disabled wenn Checkbox nicht aktiviert", () => {
    render(<GuidelinesAcceptance onAccepted={vi.fn()} />);
    const button = screen.getByText("Akzeptieren und fortfahren");
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("Button wird enabled nach Checkbox-Klick", () => {
    render(<GuidelinesAcceptance onAccepted={vi.fn()} />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    const button = screen.getByText("Akzeptieren und fortfahren");
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  it("ruft acceptGuidelines und onAccepted bei Klick auf Button", async () => {
    const onAccepted = vi.fn();
    render(<GuidelinesAcceptance onAccepted={onAccepted} />);

    // Checkbox aktivieren
    fireEvent.click(screen.getByRole("checkbox"));
    // Button klicken
    fireEvent.click(screen.getByText("Akzeptieren und fortfahren"));

    // Warten bis Promise resolved
    await vi.waitFor(() => {
      expect(mockAcceptGuidelines).toHaveBeenCalledOnce();
      expect(onAccepted).toHaveBeenCalledOnce();
    });
  });

  it("zeigt Link zu vollstaendigen Richtlinien", () => {
    render(<GuidelinesAcceptance onAccepted={vi.fn()} />);
    const link = screen.getByText("Vollständige Richtlinien lesen →");
    expect(link.getAttribute("href")).toBe("/richtlinien");
  });

  it("zeigt 5 Zusammenfassungspunkte", () => {
    render(<GuidelinesAcceptance onAccepted={vi.fn()} />);
    const checkmarks = screen.getAllByText("✓");
    expect(checkmarks.length).toBe(5);
  });
});
