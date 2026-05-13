import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import TerminalHeader from "../TerminalHeader";
import type { TerminalStatusData } from "@/lib/terminal/useTerminalData";

let terminalData: TerminalStatusData | null = null;

vi.mock("@/lib/terminal/TerminalContext", () => ({
  useTerminal: () => ({
    data: terminalData,
  }),
}));

function makeTerminalData(userName: unknown): TerminalStatusData {
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
    userName,
    greeting: "Guten Tag",
    photosCount: 0,
    remindersCount: 0,
    stickiesCount: 0,
    appointmentsToday: 0,
  } as TerminalStatusData;
}

describe("TerminalHeader Context-Guards", () => {
  afterEach(() => {
    cleanup();
    terminalData = null;
    vi.restoreAllMocks();
  });

  it("rendert kaputten UserName wie fehlenden Namen", () => {
    terminalData = makeTerminalData({ displayName: "Frau Mueller" });

    render(<TerminalHeader />);

    expect(screen.getByText(/^Gute(n)?/)).toBeInTheDocument();
    expect(screen.queryByText(/object Object/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Frau Mueller/)).not.toBeInTheDocument();
  });

  it("rendert valide UserName weiterhin in der Begruessung", () => {
    terminalData = makeTerminalData("Frau Mueller");

    render(<TerminalHeader />);

    expect(screen.getByText(/Frau Mueller/)).toBeInTheDocument();
  });
});
