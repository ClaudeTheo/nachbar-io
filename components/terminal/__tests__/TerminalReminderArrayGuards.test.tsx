import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ErinnerungenScreen from "../screens/ErinnerungenScreen";

const setActiveScreen = vi.fn();

vi.mock("@/lib/terminal/TerminalContext", () => ({
  useTerminal: () => ({
    setActiveScreen,
    token: "device-token",
  }),
}));

describe("Terminal Reminder-Array-Guards", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    setActiveScreen.mockReset();
  });

  it("rendert kaputte Reminder-Listen wie leere Listen", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        stickies: { id: "sticky-1", title: "Kaputte Notiz" },
        appointments: "kaputte Termine",
      }),
    } as Response);

    render(<ErinnerungenScreen />);

    expect(
      await screen.findByText("Keine Erinnerungen vorhanden"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Kaputte Notiz")).not.toBeInTheDocument();
  });
});
