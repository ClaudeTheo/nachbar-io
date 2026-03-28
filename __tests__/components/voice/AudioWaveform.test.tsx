import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
import { AudioWaveform } from "@/modules/voice/components/voice/AudioWaveform";

describe("AudioWaveform", () => {
  it("rendert 16 Balken", () => {
    const { container } = render(
      <AudioWaveform audioLevel={0.5} isActive={true} />,
    );
    const bars = container.querySelectorAll('[data-testid="waveform-bar"]');
    expect(bars.length).toBe(16);
  });

  it("Balken haben Quartier-Gruen Farbe (#4CAF87)", () => {
    const { container } = render(
      <AudioWaveform audioLevel={0.5} isActive={true} />,
    );
    const bars = container.querySelectorAll('[data-testid="waveform-bar"]');
    // Alle Balken haben bg-[#4CAF87] Klasse
    bars.forEach((bar) => {
      expect(bar.className).toContain("bg-[#4CAF87]");
    });
  });

  it("Container hat min-height 48px", () => {
    const { getByTestId } = render(
      <AudioWaveform audioLevel={0.5} isActive={true} />,
    );
    const container = getByTestId("waveform-container");
    expect(container.style.minHeight).toBe("48px");
  });

  it('zeigt "Ich höre zu..." Text', () => {
    const { getByText } = render(
      <AudioWaveform audioLevel={0.5} isActive={true} />,
    );
    expect(getByText("Ich höre zu...")).toBeDefined();
  });

  it("Balken-Hoehe aendert sich mit audioLevel prop", () => {
    // Bei audioLevel 0 sind Balken minimal (4px)
    const { container: c1 } = render(
      <AudioWaveform audioLevel={0} isActive={true} />,
    );
    const bars0 = c1.querySelectorAll('[data-testid="waveform-bar"]');
    const heights0 = Array.from(bars0).map((b) =>
      parseInt((b as HTMLElement).style.height),
    );

    // Bei audioLevel 1 sind Balken groesser
    const { container: c2 } = render(
      <AudioWaveform audioLevel={1} isActive={true} />,
    );
    const bars1 = c2.querySelectorAll('[data-testid="waveform-bar"]');
    const heights1 = Array.from(bars1).map((b) =>
      parseInt((b as HTMLElement).style.height),
    );

    // Mitte-Balken bei Level 1 sollten groesser sein als bei Level 0
    const maxHeight0 = Math.max(...heights0);
    const maxHeight1 = Math.max(...heights1);
    expect(maxHeight1).toBeGreaterThan(maxHeight0);
  });

  it("zeigt Fallback-Animation wenn nicht aktiv", () => {
    const { container } = render(
      <AudioWaveform audioLevel={0} isActive={false} />,
    );
    const bars = container.querySelectorAll('[data-testid="waveform-bar"]');
    // Bei !isActive sollten Balken animiert sein
    bars.forEach((bar) => {
      expect(bar.className).toContain("animate-pulse");
    });
  });
});
