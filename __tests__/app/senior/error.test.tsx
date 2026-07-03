// W7 (Befund A3:6): error.tsx fuer die (senior)-Routengruppe.
// Grosse Schrift, ruhige einfache Sprache, ein grosser Neu-laden-Knopf.
// Die 112-Leiste bleibt sichtbar, weil das (senior)-Layout bei einem
// Page-Fehler stehen bleibt (error.tsx ersetzt nur children).

import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SeniorError from "@/app/(senior)/error";

afterEach(() => {
  cleanup();
});

describe("Senior error.tsx (A3:6)", () => {
  it("erklaert den Fehler in ruhiger, einfacher Sprache ohne Technik-Jargon", () => {
    render(<SeniorError error={new Error("boom")} reset={vi.fn()} />);

    expect(
      screen.getByText(/Das hat gerade nicht geklappt/i),
    ).toBeInTheDocument();
    // Beruhigung statt Schuldgefuehl oder Technik-Sprache
    expect(screen.getByText(/Sie haben nichts falsch gemacht/i)).toBeInTheDocument();
    expect(screen.queryByText(/Error|Exception|digest/i)).not.toBeInTheDocument();
  });

  it("bietet einen grossen Neu-laden-Knopf (>=80px), der reset ausloest", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<SeniorError error={new Error("boom")} reset={reset} />);

    const button = screen.getByRole("button", { name: /neu laden/i });
    expect(button.style.minHeight).toBe("80px");

    await user.click(button);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("weist darauf hin, dass der Notruf 112 weiter funktioniert", () => {
    render(<SeniorError error={new Error("boom")} reset={vi.fn()} />);

    expect(screen.getByText(/Notruf 112/i)).toBeInTheDocument();
  });
});
