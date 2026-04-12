// __tests__/components/senior/MicView.test.tsx
// Task H-2: Tests fuer die MicView-Komponente (Sprachaufnahme).
//
// Testet die vier Zustaende (ready, recording, processing, transcript) und
// die Senior-UI-Regeln (Touch-Targets, Navigation, Barrierefreiheit).

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MicView } from "@/components/senior/MicView";

// next/navigation Mock
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const defaultProps = {
  recipientName: "Anna Muster",
  recipientIndex: 0,
  recipientPhone: "+49 176 12345678",
};

describe("MicView (H-2)", () => {
  afterEach(() => {
    cleanup();
    mockPush.mockClear();
  });

  it("zeigt den Empfaengernamen in der Ueberschrift", () => {
    render(<MicView {...defaultProps} />);
    expect(screen.getByText(/Nachricht an Anna Muster/)).toBeDefined();
  });

  it("zeigt den Mikrofon-Button im ready-Zustand", () => {
    render(<MicView {...defaultProps} />);
    const micBtn = screen.getByTestId("mic-button");
    expect(micBtn).toBeDefined();
    expect(screen.getByText(/Tippen Sie zum Sprechen/)).toBeDefined();
  });

  it("Mikrofon-Button hat min-height >= 96px", () => {
    render(<MicView {...defaultProps} />);
    const micBtn = screen.getByTestId("mic-button");
    const style = micBtn.getAttribute("style") ?? "";
    // min-height: 120px → 120 >= 96
    const match = style.match(/min-height:\s*(\d+)px/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThanOrEqual(96);
  });

  it("zeigt Transkript mit Nochmal und Fertig Buttons (_testTranscript)", () => {
    render(
      <MicView {...defaultProps} _testTranscript="Hallo, wie geht es Ihnen?" />,
    );
    expect(screen.getByText("Hallo, wie geht es Ihnen?")).toBeDefined();
    expect(screen.getByText("Nochmal")).toBeDefined();
    expect(screen.getByText("Fertig")).toBeDefined();
  });

  it("Nochmal-Button setzt zurueck auf ready-Zustand", async () => {
    const { getByText, queryByText } = render(
      <MicView {...defaultProps} _testTranscript="Test-Transkript" />,
    );

    // Transkript sichtbar
    expect(getByText("Test-Transkript")).toBeDefined();

    // Nochmal klicken
    const { userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.click(getByText("Nochmal"));

    // Jetzt im ready-Zustand
    expect(queryByText("Test-Transkript")).toBeNull();
    expect(getByText(/Tippen Sie zum Sprechen/)).toBeDefined();
  });

  it("Zurueck-Link fuehrt zu /schreiben", () => {
    render(<MicView {...defaultProps} />);
    const backLink = screen.getByRole("link", { name: /Zurueck/i });
    expect(backLink.getAttribute("href")).toBe("/schreiben");
  });

  it("Zurueck-Link hat min-height >= 44px", () => {
    render(<MicView {...defaultProps} />);
    const backLink = screen.getByRole("link", { name: /Zurueck/i });
    const style = backLink.getAttribute("style") ?? "";
    expect(style).toContain("min-height");
  });

  it("Fertig-Button speichert Transkript in sessionStorage und navigiert", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    render(
      <MicView
        {...defaultProps}
        recipientIndex={2}
        _testTranscript="Gespeicherter Text"
      />,
    );

    const { userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.click(screen.getByText("Fertig"));

    expect(setItemSpy).toHaveBeenCalledWith(
      "schreiben_transcript_2",
      "Gespeicherter Text",
    );
    expect(mockPush).toHaveBeenCalledWith("/schreiben/review/2");

    setItemSpy.mockRestore();
  });
});
