import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import TerminalHeader from "../TerminalHeader";
import ScreensaverOverlay from "../ScreensaverOverlay";
import type { TerminalStatusData } from "@/lib/terminal/useTerminalData";

let terminalData: TerminalStatusData | null = null;

vi.mock("@/lib/terminal/TerminalContext", () => ({
  useTerminal: () => ({
    data: terminalData,
    token: "device-token",
  }),
}));

vi.mock("@/lib/terminal/useIdleTimer", () => ({
  useIdleTimer: () => ({
    isIdle: true,
    wake: vi.fn(),
  }),
}));

function makeTerminalData(
  forecast: unknown,
  temp: unknown = 18,
): TerminalStatusData {
  return {
    weather: {
      temp,
      icon: "sun",
      forecast,
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
  } as TerminalStatusData;
}

describe("Terminal-Wetter-Forecast-Guards", () => {
  afterEach(() => {
    cleanup();
    terminalData = null;
    vi.restoreAllMocks();
  });

  it("rendert TerminalHeader mit kaputtem Forecast wie ohne Forecast", () => {
    terminalData = makeTerminalData("kaputter Forecast");

    expect(() => render(<TerminalHeader />)).not.toThrow();
    expect(screen.getByText("18°C")).toBeInTheDocument();
    expect(screen.queryByText("kaputter Forecast")).not.toBeInTheDocument();
  });

  it("rendert ScreensaverOverlay mit kaputtem Forecast wie ohne Forecast", () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);
    terminalData = makeTerminalData({ day: "Mo", tempMax: 20 });

    expect(() => render(<ScreensaverOverlay />)).not.toThrow();
    expect(screen.getAllByText("18°C").length).toBeGreaterThan(0);
    expect(screen.queryByText("Mo 20°")).not.toBeInTheDocument();
  });

  it("rendert TerminalHeader mit kaputter Temperatur wie ohne Temperatur", () => {
    terminalData = makeTerminalData([], { value: 18 });

    render(<TerminalHeader />);

    expect(screen.getByText("--°C")).toBeInTheDocument();
    expect(screen.queryByText("[object Object]°C")).not.toBeInTheDocument();
  });

  it("rendert ScreensaverOverlay mit kaputter Temperatur wie ohne Temperatur", () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);
    terminalData = makeTerminalData([], Number.POSITIVE_INFINITY);

    render(<ScreensaverOverlay />);

    expect(screen.getAllByText("--°C").length).toBeGreaterThan(0);
    expect(screen.queryByText("Infinity°C")).not.toBeInTheDocument();
  });
});
