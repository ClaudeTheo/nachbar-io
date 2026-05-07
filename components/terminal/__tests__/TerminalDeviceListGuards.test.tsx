import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import FamilienFotosScreen from "../screens/FamilienFotosScreen";
import ScreensaverOverlay from "../ScreensaverOverlay";
import VideochatScreen from "../screens/VideochatScreen";
import type { TerminalStatusData } from "@/lib/terminal/useTerminalData";

const setActiveScreen = vi.fn();

let terminalData: TerminalStatusData | null = null;

vi.mock("@/lib/terminal/TerminalContext", () => ({
  useTerminal: () => ({
    data: terminalData,
    setActiveScreen,
    token: "device-token",
  }),
}));

vi.mock("@/lib/terminal/useIdleTimer", () => ({
  useIdleTimer: () => ({
    isIdle: true,
    wake: vi.fn(),
  }),
}));

function makeTerminalData(): TerminalStatusData {
  return {
    weather: {
      temp: 18,
      icon: "sun",
      forecast: [],
    },
    alerts: [],
    lastCheckin: null,
    nextAppointment: null,
    unreadCount: 0,
    news: [],
    newsCount: 0,
    userName: "Frau Mueller",
    greeting: "Guten Tag",
    photosCount: 0,
    remindersCount: 0,
    stickiesCount: 0,
    appointmentsToday: 0,
  };
}

describe("Terminal Device-Listen-Guards", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    setActiveScreen.mockReset();
    terminalData = null;
  });

  it("rendert Familienfotos mit kaputtem photos-Wert wie ohne Fotos", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        photos: { id: "photo-1", caption: "Kaputtes Foto" },
      }),
    } as Response);

    render(<FamilienFotosScreen />);

    expect(await screen.findByText("Noch keine Fotos vorhanden")).toBeInTheDocument();
    expect(screen.queryByText("Kaputtes Foto")).not.toBeInTheDocument();
  });

  it("rendert Videochat mit kaputtem contacts-Wert wie ohne Kontakte", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        contacts: { caregiver_name: "Kaputter Kontakt" },
      }),
    } as Response);

    render(<VideochatScreen />);

    expect(
      await screen.findByText("Noch keine Kontakte für Videoanrufe eingerichtet."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Kaputter Kontakt")).not.toBeInTheDocument();
  });

  it("rendert Screensaver mit kaputten Foto- und Sticky-Listen ohne Fremdinhalte", async () => {
    terminalData = makeTerminalData();
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          photos: {
            0: {
              id: "photo-1",
              url: "/kaputtes-foto.jpg",
              caption: "Kaputtes Screensaver-Foto",
            },
            length: 1,
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stickies: { id: "sticky-1", title: "Kaputte Screensaver-Notiz" },
        }),
      } as Response);

    render(<ScreensaverOverlay />);

    expect(await screen.findAllByText("18°C")).toHaveLength(2);
    expect(screen.queryByText("Kaputtes Screensaver-Foto")).not.toBeInTheDocument();
    expect(screen.queryByText("Kaputte Screensaver-Notiz")).not.toBeInTheDocument();
  });
});
