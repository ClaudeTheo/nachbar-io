// __tests__/components/senior/ReviewView.test.tsx
// Task H-3/H-4: Tests fuer die ReviewView-Komponente (KI-Vorschlag).
//
// Testet die Zustaende (loading, suggestion, editing) und die
// Senior-UI-Regeln (Touch-Targets, Navigation, WhatsApp-Link).

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { ReviewView } from "@/components/senior/ReviewView";

// next/navigation Mock
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

// TTSButton Mock — vereinfachter Button ohne Audio-Logik
vi.mock("@/modules/voice/components/companion/TTSButton", () => ({
  TTSButton: ({ text }: { text: string }) => (
    <button data-testid="tts-button" aria-label="Vorlesen">
      Vorlesen ({text.slice(0, 20)})
    </button>
  ),
}));

const defaultProps = {
  recipientName: "Anna Muster",
  recipientIndex: 0,
  recipientPhone: "+49 176 12345678",
  transcript: "Hallo Anna wie geht es dir",
};

describe("ReviewView (H-3/H-4)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  it("zeigt Loading-Zustand 'Formuliere Nachricht' initial", () => {
    // Fetch haengt — Promise wird nicht aufgeloest
    global.fetch = vi.fn(
      () => new Promise<Response>(() => {}),
    ) as unknown as typeof fetch;

    render(<ReviewView {...defaultProps} />);
    expect(screen.getByText("Formuliere Nachricht...")).toBeDefined();
  });

  it("zeigt KI-Vorschlag mit Aendern und Senden nach Fetch", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            text: "Liebe Anna, wie geht es Ihnen? Herzliche Gruesse",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    ) as unknown as typeof fetch;

    render(<ReviewView {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Liebe Anna, wie geht es Ihnen? Herzliche Gruesse",
        ),
      ).toBeDefined();
    });

    expect(screen.getByText("Aendern")).toBeDefined();
    expect(screen.getByText("Senden")).toBeDefined();
  });

  it("Aendern-Button zeigt bearbeitbare Textarea", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ text: "KI-Text" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ) as unknown as typeof fetch;

    render(<ReviewView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Aendern")).toBeDefined();
    });

    const { userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.click(screen.getByText("Aendern"));

    const textarea = screen.getByLabelText("Nachricht bearbeiten");
    expect(textarea).toBeDefined();
    expect((textarea as HTMLTextAreaElement).value).toBe("KI-Text");
    expect(screen.getByText("Fertig")).toBeDefined();
  });

  it("Senden-Link enthaelt wa.me URL mit Text-Parameter", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ text: "Hallo Anna" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ) as unknown as typeof fetch;

    render(<ReviewView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Senden")).toBeDefined();
    });

    const sendenLink = screen.getByText("Senden");
    const href = sendenLink.getAttribute("href") ?? "";
    expect(href).toContain("wa.me/");
    expect(href).toContain("text=");
  });

  it("Zurueck-Link fuehrt zu /schreiben/mic/{index}", () => {
    global.fetch = vi.fn(
      () => new Promise<Response>(() => {}),
    ) as unknown as typeof fetch;

    render(<ReviewView {...defaultProps} recipientIndex={3} />);

    const backLink = screen.getByRole("link", { name: /Zurueck/i });
    expect(backLink.getAttribute("href")).toBe("/schreiben/mic/3");
  });

  it("zeigt Amber-Warnung wenn KI-Fetch fehlschlaegt", async () => {
    global.fetch = vi.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as unknown as typeof fetch;

    render(<ReviewView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    // Fallback: Original-Transkript wird angezeigt
    expect(
      screen.getByText("Hallo Anna wie geht es dir"),
    ).toBeDefined();
  });
});
