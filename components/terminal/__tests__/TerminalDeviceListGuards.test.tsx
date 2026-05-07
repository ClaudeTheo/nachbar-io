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

  it("filtert kaputte Foto-Eintraege aus Familienfotos", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        photos: [
          null,
          {
            id: "photo-1",
            url: "/familie.jpg",
            caption: "Sommerfest",
            pinned: false,
            createdAt: "2026-05-07T08:00:00.000Z",
          },
          {
            id: "photo-2",
            url: 123,
            caption: "Kaputte URL",
            pinned: false,
            createdAt: "2026-05-07T08:00:00.000Z",
          },
          {
            id: "photo-3",
            url: "/kaputtes-datum.jpg",
            caption: "Kaputtes Datum",
            pinned: false,
            createdAt: "kein Datum",
          },
        ],
      }),
    } as Response);

    render(<FamilienFotosScreen />);

    expect(await screen.findByText("Sommerfest")).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
    expect(screen.queryByText("Kaputte URL")).not.toBeInTheDocument();
    expect(screen.queryByText("Kaputtes Datum")).not.toBeInTheDocument();
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

  it("filtert kaputte Kontakt-Eintraege aus Videochat", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        contacts: [
          null,
          {
            id: "contact-1",
            caregiver_id: "caregiver-1",
            caregiver_name: "Anna Schmidt",
            caregiver_avatar: null,
            auto_answer_allowed: true,
            auto_answer_start: "09:00",
            auto_answer_end: "18:00",
            is_online: true,
          },
          {
            id: "contact-2",
            caregiver_id: "caregiver-2",
            caregiver_name: null,
            caregiver_avatar: null,
            auto_answer_allowed: false,
            auto_answer_start: "09:00",
            auto_answer_end: "18:00",
            is_online: false,
          },
        ],
      }),
    } as Response);

    render(<VideochatScreen />);

    expect(await screen.findByText("Anna Schmidt")).toBeInTheDocument();
    expect(screen.queryByText("Noch keine Kontakte für Videoanrufe eingerichtet.")).not.toBeInTheDocument();
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

  it("filtert kaputte Screensaver-Foto- und Sticky-Eintraege", async () => {
    terminalData = makeTerminalData();
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          photos: [
            null,
            {
              id: "photo-1",
              url: "/familie.jpg",
              caption: "Sommerfest im Screensaver",
            },
            {
              id: "photo-2",
              url: 123,
              caption: "Kaputtes Screensaver-Bild",
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stickies: [
            null,
            { id: "sticky-1", title: "Medikamente stehen bereit" },
            { id: "sticky-2", title: "" },
          ],
        }),
      } as Response);

    render(<ScreensaverOverlay />);

    expect(await screen.findByText("Sommerfest im Screensaver")).toBeInTheDocument();
    expect(screen.getByText("📌 Medikamente stehen bereit")).toBeInTheDocument();
    expect(screen.queryByText("Kaputtes Screensaver-Bild")).not.toBeInTheDocument();
  });
});
