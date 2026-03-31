import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryConsentScreen } from "@/modules/memory/components/MemoryConsentScreen";

describe("MemoryConsentScreen", () => {
  it("zeigt KI-Gesicht und 3 Consent-Optionen", () => {
    const { container } = render(
      <MemoryConsentScreen onConsent={vi.fn()} onSkip={vi.fn()} />,
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Profil, Routinen, Vorlieben, Kontakte/).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Alltagsbedürfnisse/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Private Notizen/).length).toBeGreaterThan(0);
  });

  it("ruft onConsent mit ausgewaehlten Typen auf", () => {
    const onConsent = vi.fn();
    render(<MemoryConsentScreen onConsent={onConsent} onSkip={vi.fn()} />);

    const buttons = screen.getAllByRole("button", {
      name: /Gedächtnis aktivieren/i,
    });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onConsent).toHaveBeenCalledWith({
      memory_basis: true,
      memory_care: false,
      memory_personal: false,
    });
  });

  it("ruft onSkip auf wenn ohne Gedaechtnis gewaehlt", () => {
    const onSkip = vi.fn();
    render(<MemoryConsentScreen onConsent={vi.fn()} onSkip={onSkip} />);

    const buttons = screen.getAllByRole("button", {
      name: /Ohne Gedächtnis nutzen/i,
    });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onSkip).toHaveBeenCalled();
  });

  it("zeigt MDR-Hinweis", () => {
    render(<MemoryConsentScreen onConsent={vi.fn()} onSkip={vi.fn()} />);
    expect(
      screen.getAllByText(/Keine Diagnosen, Medikamente oder Vitalwerte/)
        .length,
    ).toBeGreaterThan(0);
  });
});
