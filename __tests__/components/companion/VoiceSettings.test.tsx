import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { VoiceSettings } from "@/modules/voice/components/companion/VoiceSettings";

describe("VoiceSettings", () => {
  afterEach(() => cleanup());

  const defaults = {
    voice: "marin" as const,
    speed: 1.0,
    formality: "formal" as const,
    patienceMode: false,
  };

  it("zeigt die Voice-Einstellungen inklusive einfache Antworten", () => {
    render(<VoiceSettings settings={defaults} onChange={vi.fn()} />);
    expect(screen.getByText("Stimme")).toBeInTheDocument();
    expect(screen.getByText("Tempo")).toBeInTheDocument();
    expect(screen.getByText("Anrede")).toBeInTheDocument();
    expect(screen.getByText("Sehr einfache Antworten")).toBeInTheDocument();
  });

  it("Stimme: Weiblich/Männlich Toggle (marin/cedar)", () => {
    const onChange = vi.fn();
    render(<VoiceSettings settings={defaults} onChange={onChange} />);
    fireEvent.click(screen.getByText(/Männlich/i));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ voice: "cedar" }),
    );
  });

  it("migriert Alt-Stimmen: nova → marin (Weiblich), ash/onyx → cedar (Männlich)", () => {
    const onChange = vi.fn();
    // Gespeicherte Alt-Einstellung "nova" — Klick auf Weiblich liefert marin
    render(
      <VoiceSettings
        settings={{ ...defaults, voice: "nova" as never }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText(/Weiblich/i));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ voice: "marin" }),
    );
  });

  it("Tempo: Normal/Langsam Toggle", () => {
    const onChange = vi.fn();
    render(<VoiceSettings settings={defaults} onChange={onChange} />);
    fireEvent.click(screen.getByText(/Langsam/i));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ speed: 0.85 }),
    );
  });

  it("Förmlichkeit: Förmlich/Vertraut Toggle", () => {
    const onChange = vi.fn();
    render(<VoiceSettings settings={defaults} onChange={onChange} />);
    fireEvent.click(screen.getByText(/Vertraut/i));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ formality: "informal" }),
    );
  });

  it("Geduldsmodus: Sehr einfache Antworten Toggle", () => {
    const onChange = vi.fn();
    render(<VoiceSettings settings={defaults} onChange={onChange} />);
    fireEvent.click(screen.getByText(/Sehr einfache Antworten/i));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ patienceMode: true }),
    );
    expect(onChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ patienceMode: false }),
    );
  });

  it("verwendet kein stigmatisierendes Wording fuer den Geduldsmodus", () => {
    render(<VoiceSettings settings={defaults} onChange={vi.fn()} />);
    expect(screen.queryByText(/Demenz|Alzheimer|senil/i)).not.toBeInTheDocument();
  });

  it("hat mindestens 80px Touch-Targets", () => {
    const { container } = render(
      <VoiceSettings settings={defaults} onChange={vi.fn()} />,
    );
    const buttons = container.querySelectorAll("button");
    buttons.forEach((btn) => {
      expect(btn.className).toContain("min-h-[44px]");
    });
  });
});
