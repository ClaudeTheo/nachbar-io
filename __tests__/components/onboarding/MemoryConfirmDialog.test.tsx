// __tests__/components/onboarding/MemoryConfirmDialog.test.tsx
// Welle C C6 — Confirm-Dialog fuer KI-Vorschlaege.
//
// Wenn das save_memory-Tool im mode='confirm' antwortet (z.B. weil der Wert
// medizinisch sensibel ist oder die Quote knapp wird), oeffnet sich dieser
// Dialog. Senior-Mode: zwei grosse Buttons, klare deutsche Labels.

import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";

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
});
