import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

vi.mock("@/components/terminal/video/KioskActiveCall", () => ({
  default: ({ onAudioOnly }: { onAudioOnly: () => void }) => (
    <button type="button" onClick={onAudioOnly}>
      Nur Ton
    </button>
  ),
}));

vi.mock("@/components/terminal/video/KioskAudioOnlyScreen", () => ({
  default: ({ onRetryVideo }: { onRetryVideo: () => void }) => (
    <button type="button" onClick={onRetryVideo}>
      Video erneut versuchen
    </button>
  ),
}));

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

  it("normalisiert Dashboard-Datumsstrings mit Rand-Leerzeichen", () => {
    terminalState.data = makeTerminalData({
      lastCheckin: "  2026-05-07T08:15:00  ",
    });

    render(<TerminalPage />);

    const checkinButton = screen.getByRole("button", { name: /wie geht's mir/i });

    expect(within(checkinButton).getByText("Letztes: 08:15 Uhr")).toBeInTheDocument();
    expect(within(checkinButton).queryByText("Heute noch nicht geteilt")).not.toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date|NaN/i)).not.toBeInTheDocument();
  });

  it("normalisiert aktive Call-Werte vor dem Wechsel zu Nur-Ton", () => {
    terminalState.activeScreen = "active-call";
    terminalState.activeCall = {
      callId: " call-42 ",
      remoteUserId: " user-42 ",
      remoteName: "   ",
      isInitiator: "yes",
      mediaMode: "screenshare",
      offer: { type: "answer", sdp: "wrong-kind" },
    };

    render(<TerminalPage />);

    fireEvent.click(screen.getByRole("button", { name: "Nur Ton" }));

    expect(setActiveCall).toHaveBeenCalledWith({
      callId: "call-42",
      remoteUserId: "user-42",
      remoteName: "Unbekannter Kontakt",
      isInitiator: false,
      mediaMode: "audio-only",
    });
  });

  it("normalisiert aktive Call-Werte vor dem erneuten Video-Versuch", () => {
    terminalState.activeScreen = "active-call";
    terminalState.activeCall = {
      callId: " call-43 ",
      remoteUserId: " user-43 ",
      remoteName: "",
      isInitiator: "yes",
      mediaMode: "audio-only",
      offer: { type: "answer", sdp: "wrong-kind" },
    };

    render(<TerminalPage />);

    fireEvent.click(screen.getByRole("button", { name: "Video erneut versuchen" }));

    expect(setActiveCall).toHaveBeenCalledWith({
      callId: "call-43",
      remoteUserId: "user-43",
      remoteName: "Unbekannter Kontakt",
      isInitiator: false,
      mediaMode: "video",
    });
  });
});
