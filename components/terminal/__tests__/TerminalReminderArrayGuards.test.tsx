import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ErinnerungenScreen from "../screens/ErinnerungenScreen";
import AppointmentPopup from "../AppointmentPopup";

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

  it("filtert kaputte Sticky- und Termin-Eintraege", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        stickies: [
          null,
          { id: "sticky-1", title: "Trinken nicht vergessen", created_at: "2026-05-07T08:00:00.000Z" },
          { id: "sticky-2", title: "", created_at: "2026-05-07T08:00:00.000Z" },
        ],
        appointments: [
          null,
          {
            id: "appointment-1",
            title: "Hausarzt",
            scheduled_at: "2026-05-07T10:00:00.000Z",
            expires_at: null,
          },
          {
            id: "appointment-2",
            title: "Kaputter Termin",
            scheduled_at: "kein Datum",
            expires_at: null,
          },
        ],
      }),
    } as Response);

    render(<ErinnerungenScreen />);

    expect(await screen.findByText("Trinken nicht vergessen")).toBeInTheDocument();
    expect(screen.getByText("Hausarzt")).toBeInTheDocument();
    expect(screen.queryByText("Kaputter Termin")).not.toBeInTheDocument();
  });

  it("ignoriert kaputte Upcoming-Popups", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        upcomingPopup: {
          id: "popup-1",
          title: "Kaputtes Popup",
          scheduled_at: "kein Datum",
        },
      }),
    } as Response);

    render(<AppointmentPopup />);

    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(screen.queryByText("Kaputtes Popup")).not.toBeInTheDocument();
  });
});
