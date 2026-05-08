import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import TerminalPage from "@/app/terminal/[token]/page";
import type { TerminalStatusData } from "@/lib/terminal/useTerminalData";

const setActiveScreen = vi.fn();
const setActiveCall = vi.fn();

let terminalState: {
  activeScreen: string;
  activeCall: unknown;
  data: TerminalStatusData | null;
  loading: boolean;
  error: string | null;
} = {
  activeScreen: "home",
  activeCall: null,
  data: null,
  loading: false,
  error: null,
};

vi.mock("@/lib/terminal/TerminalContext", async () => {
  const actual = await vi.importActual<typeof import("@/lib/terminal/TerminalContext")>(
    "@/lib/terminal/TerminalContext",
  );

  return {
    ...actual,
    useTerminal: () => ({
      ...terminalState,
      setActiveScreen,
      setActiveCall,
    }),
  };
});

function makeTerminalData(overrides: Partial<TerminalStatusData> = {}): TerminalStatusData {
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
    ...overrides,
  };
}

describe("TerminalPage Dashboard", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    setActiveScreen.mockReset();
    setActiveCall.mockReset();
    terminalState = {
      activeScreen: "home",
      activeCall: null,
      data: null,
      loading: false,
      error: null,
    };
  });

  it("rendert kaputte Dashboard-Subtitle-Werte mit ruhigen Fallbacks", () => {
    terminalState.data = makeTerminalData({
      lastCheckin: "kein Datum",
      newsCount: Number.POSITIVE_INFINITY,
      photosCount: Number.POSITIVE_INFINITY,
      stickiesCount: Number.POSITIVE_INFINITY,
      appointmentsToday: Number.POSITIVE_INFINITY,
    } as Partial<TerminalStatusData>);

    render(<TerminalPage />);

    expect(screen.queryByText(/Invalid Date/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Infinity/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument();

    expect(
      within(screen.getByRole("button", { name: /wie geht's mir/i })).getByText(
        "Heute noch nicht geteilt",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: /neuigkeiten/i })).getByText("Keine neuen"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: /erinnerungen/i })).getByText("Keine neuen"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: /familienfotos/i })).getByText(
        "Noch keine Fotos",
      ),
    ).toBeInTheDocument();
  });
});
