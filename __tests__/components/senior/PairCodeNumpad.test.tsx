// __tests__/components/senior/PairCodeNumpad.test.tsx
// Welle B Folgearbeit: Numpad-Komponente fuer 6-stelligen Pair-Code.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PairCodeNumpad } from "@/components/senior/PairCodeNumpad";

afterEach(() => {
  cleanup();
});

describe("PairCodeNumpad", () => {
  it("rendert 10 Ziffern-Tasten + Loeschen + Abbrechen", () => {
    render(<PairCodeNumpad onSubmit={vi.fn()} onCancel={vi.fn()} />);
    for (let i = 0; i <= 9; i++) {
      expect(
        screen.getByRole("button", { name: String(i) }),
      ).toBeInTheDocument();
    }
    expect(
      screen.getByRole("button", { name: /loeschen/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /abbrechen/i }),
    ).toBeInTheDocument();
  });

  it("zeigt eingegebene Ziffern, maximal 6", () => {
    render(<PairCodeNumpad onSubmit={vi.fn()} onCancel={vi.fn()} />);
    for (const d of ["1", "2", "3", "4", "5", "6", "7"]) {
      fireEvent.click(screen.getByRole("button", { name: d }));
    }
    // 7. Ziffer wird ignoriert
    expect(screen.getByTestId("numpad-display")).toHaveTextContent("123456");
  });

  it("Loeschen entfernt letzte Ziffer", () => {
    render(<PairCodeNumpad onSubmit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: /loeschen/i }));
    expect(screen.getByTestId("numpad-display")).toHaveTextContent("1");
  });

  it("ruft onSubmit mit 6-stelligem Code bei 6. Ziffer", () => {
    const onSubmit = vi.fn();
    render(<PairCodeNumpad onSubmit={onSubmit} onCancel={vi.fn()} />);
    for (const d of ["8", "4", "7", "3", "0", "2"]) {
      fireEvent.click(screen.getByRole("button", { name: d }));
    }
    expect(onSubmit).toHaveBeenCalledWith("847302");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("ruft onCancel bei Abbrechen-Klick", () => {
    const onCancel = vi.fn();
    render(<PairCodeNumpad onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /abbrechen/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
