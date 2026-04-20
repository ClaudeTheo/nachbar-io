// __tests__/components/onboarding/MemoryConfirmDialog.test.tsx
// Welle C C6 — Confirm-Dialog fuer KI-Vorschlaege.
//
// Wenn das save_memory-Tool im mode='confirm' antwortet (z.B. weil der Wert
// medizinisch sensibel ist oder die Quote knapp wird), oeffnet sich dieser
// Dialog. Senior-Mode: zwei grosse Buttons, klare deutsche Labels.

import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

// TTS-Hook mocken — Autoplay beim Oeffnen wird getestet, aber ohne
// echten fetch auf /api/voice/tts. Mock MUSS vor dem Komponenten-Import
// stehen, damit die Komponente den gemockten Hook einsaugt.
const mockPlay = vi.fn();
const mockStop = vi.fn();
vi.mock("@/modules/voice/hooks/useTtsPlayback", () => ({
  useTtsPlayback: () => ({
    play: mockPlay,
    stop: mockStop,
    isLoading: false,
    isPlaying: false,
  }),
}));

import { MemoryConfirmDialog } from "@/modules/voice/components/onboarding/MemoryConfirmDialog";
import type { PendingConfirmation } from "@/modules/voice/hooks/useOnboardingTurn";

const sampleItem: PendingConfirmation = {
  ok: true,
  mode: "confirm",
  factId: null,
  category: "personal",
  key: "geburtstag",
  value: "1942-03-12",
};

beforeEach(() => {
  mockPlay.mockReset();
  mockStop.mockReset();
});

afterEach(() => cleanup());

describe("MemoryConfirmDialog", () => {
  it("rendert NICHTS wenn item=null", () => {
    render(
      <MemoryConfirmDialog
        item={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByText(/speichern/i)).toBeNull();
  });

  it("zeigt Wert + lesbares Kategorie-Label wenn item gesetzt ist", () => {
    render(
      <MemoryConfirmDialog
        item={sampleItem}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("1942-03-12")).toBeInTheDocument();
    // Kategorie 'personal' wird auf Deutsch ausgegeben
    expect(screen.getByText(/persoenlich/i)).toBeInTheDocument();
  });

  it("loest onConfirm beim Klick auf 'Ja, speichern'", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryConfirmDialog
        item={sampleItem}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /ja.*speichern/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("loest onCancel beim Klick auf 'Nein, danke'", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryConfirmDialog
        item={sampleItem}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: /nein.*danke/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Senior-Mode: beide Buttons haben min-height >= 80px", () => {
    render(
      <MemoryConfirmDialog
        item={sampleItem}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const yes = screen.getByRole("button", { name: /ja.*speichern/i });
    const no = screen.getByRole("button", { name: /nein.*danke/i });

    // Inline-Style minHeight: 80px wird gesetzt
    expect(yes.style.minHeight).toBe("80px");
    expect(no.style.minHeight).toBe("80px");
  });

  // -------------------------------------------------------------------------
  // C8 UX-Upgrade: TTS-Autoplay + Stichwort + Beruhigung + Label-Konsistenz
  // -------------------------------------------------------------------------

  it("liest beim Oeffnen den Inhalt automatisch vor (TTS-Autoplay)", async () => {
    render(
      <MemoryConfirmDialog
        item={sampleItem}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });
    const spokenText = String(mockPlay.mock.calls[0][0] ?? "");
    // Der vorgelesene Text muss sowohl den Wert als auch die Entscheidungs-
    // frage enthalten, damit der Senior rein akustisch reagieren kann.
    expect(spokenText).toMatch(/merken/i);
    expect(spokenText).toContain("1942-03-12");
  });

  it("stoppt TTS beim Schliessen (Cleanup)", async () => {
    const { rerender } = render(
      <MemoryConfirmDialog
        item={sampleItem}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // Dialog wieder zu machen (item = null)
    rerender(
      <MemoryConfirmDialog
        item={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mockStop).toHaveBeenCalled();
    });
  });

  it("zeigt Stichwort (key) gross und lesbar an — nicht nur den Wert", () => {
    render(
      <MemoryConfirmDialog
        item={{ ...sampleItem, key: "lieblingsessen", value: "Apfelstrudel" }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // Key-Label erscheint in der Anzeige (freundlich formatiert, nicht raw
    // snake_case)
    expect(screen.getByText(/lieblingsessen/i)).toBeInTheDocument();
    expect(screen.getByText("Apfelstrudel")).toBeInTheDocument();
  });

  it("zeigt Beruhigungs-Hinweis 'jederzeit wieder loeschen'", () => {
    render(
      <MemoryConfirmDialog
        item={sampleItem}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/jederzeit.*(loeschen|entfernen)/i),
    ).toBeInTheDocument();
  });

  it("Label fuer 'routine' ist 'Routinen' (konsistent zu /profil/gedaechtnis)", () => {
    render(
      <MemoryConfirmDialog
        item={{ ...sampleItem, category: "routine" }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    // Bisher stand hier 'Tagesablauf', was nicht zu SeniorMemoryFactList
    // passt — dort ist routine = 'Routinen'. Senior darf beide UIs nicht
    // mit unterschiedlichen Woertern verwirren.
    expect(screen.getByText(/^routinen$/i)).toBeInTheDocument();
    expect(screen.queryByText(/tagesablauf/i)).toBeNull();
  });

  it("loest leichte Vibration beim Oeffnen aus (wenn verfuegbar)", () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(globalThis.navigator, "vibrate", {
      configurable: true,
      value: vibrateMock,
    });

    render(
      <MemoryConfirmDialog
        item={sampleItem}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(vibrateMock).toHaveBeenCalledTimes(1);
    // Sanft: einmalig unter 40ms (keine laute Warnung, nur Aufmerksamkeit)
    const arg = vibrateMock.mock.calls[0][0];
    const duration = Array.isArray(arg) ? arg[0] : arg;
    expect(typeof duration).toBe("number");
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThanOrEqual(40);
  });
});
