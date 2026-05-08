import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import NewsScreen from "../screens/NewsScreen";
import type { TerminalStatusData } from "@/lib/terminal/useTerminalData";

const setActiveScreen = vi.fn();

let terminalData: TerminalStatusData | null = null;

vi.mock("@/lib/terminal/TerminalContext", () => ({
  useTerminal: () => ({
    data: terminalData,
    setActiveScreen,
  }),
}));

function makeTerminalData(news: unknown): TerminalStatusData {
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
    news: news as TerminalStatusData["news"],
    newsCount: 0,
    userName: "Frau Mueller",
    greeting: "Guten Tag",
    photosCount: 0,
    remindersCount: 0,
    stickiesCount: 0,
    appointmentsToday: 0,
  };
}

describe("Terminal NewsScreen-Guards", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    setActiveScreen.mockReset();
    terminalData = null;
  });

  it("rendert kaputten news-Wert wie eine leere Liste", () => {
    terminalData = makeTerminalData({ title: "Kaputte Neuigkeit" });

    render(<NewsScreen />);

    expect(screen.getByText("Keine Neuigkeiten")).toBeInTheDocument();
    expect(screen.queryByText("Kaputte Neuigkeit")).not.toBeInTheDocument();
  });

  it("filtert kaputte News-Eintraege vor der Anzeige", () => {
    terminalData = makeTerminalData([
      null,
      {
        id: "news-1",
        title: "Wochenmarkt am Samstag",
        summary: "Frisches Obst und Gemuese.",
        category: "community",
        categoryLabel: "Quartier",
        relevance: 2,
        publishedAt: "2026-05-07T09:00:00.000Z",
      },
      {
        id: "news-2",
        title: "Kaputtes Datum",
        summary: "Soll nicht sichtbar sein.",
        category: "community",
        categoryLabel: "Quartier",
        relevance: 1,
        publishedAt: "kein Datum",
      },
      {
        id: "news-3",
        title: { text: "Kaputter Titel" },
        summary: "Soll nicht crashen.",
        category: "community",
        categoryLabel: "Quartier",
        relevance: 1,
        publishedAt: "2026-05-07T09:00:00.000Z",
      },
    ]);

    render(<NewsScreen />);

    expect(screen.getByText("Wochenmarkt am Samstag")).toBeInTheDocument();
    expect(screen.queryByText("Kaputtes Datum")).not.toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date|NaN/i)).not.toBeInTheDocument();
  });
});
