import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import IncomingCallOverlay from "../IncomingCallOverlay";

const setIncomingCall = vi.fn();
const setActiveCall = vi.fn();
const setActiveScreen = vi.fn();

let incomingCall: unknown = null;

vi.mock("@/lib/terminal/TerminalContext", async () => {
  const actual = await vi.importActual<typeof import("@/lib/terminal/TerminalContext")>(
    "@/lib/terminal/TerminalContext",
  );

  return {
    ...actual,
    useTerminal: () => ({
      incomingCall,
      setIncomingCall,
      setActiveCall,
      setActiveScreen,
    }),
  };
});

describe("IncomingCallOverlay", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    setIncomingCall.mockReset();
    setActiveCall.mockReset();
    setActiveScreen.mockReset();
    incomingCall = null;
  });

  it("rendert kein Overlay fuer kaputte direkte Incoming-Call-Werte", () => {
    incomingCall = {
      callId: "call-1",
      callerId: "user-1",
      callerName: "Kaputter Anruf",
      callerAvatar: null,
      autoAnswer: false,
      offer: { type: "answer", sdp: "wrong-kind" },
    };

    render(<IncomingCallOverlay />);

    expect(screen.queryByText("Kaputter Anruf")).not.toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("setzt beim Annehmen normalisierte Active-Call-Daten", () => {
    incomingCall = {
      callId: " call-2 ",
      callerId: " user-2 ",
      callerName: "   ",
      callerAvatar: { url: "https://example.test/avatar.png" },
      autoAnswer: "yes",
      offer: { type: "offer", sdp: "valid-sdp" },
    };

    render(<IncomingCallOverlay />);
    fireEvent.click(screen.getByRole("button", { name: /annehmen/i }));

    expect(setActiveCall).toHaveBeenCalledWith({
      callId: "call-2",
      remoteUserId: "user-2",
      remoteName: "Unbekannter Kontakt",
      isInitiator: false,
      offer: { type: "offer", sdp: "valid-sdp" },
      mediaMode: "video",
    });
    expect(setIncomingCall).toHaveBeenCalledWith(null);
    expect(setActiveScreen).toHaveBeenCalledWith("active-call");
  });
});
