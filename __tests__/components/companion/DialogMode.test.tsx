import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DialogMode } from "@/modules/voice/components/companion/DialogMode";

const { mockConnect, mockEnd, mockSetMicEnabled, mockFetch } = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockEnd: vi.fn(),
  mockSetMicEnabled: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock("@/lib/webrtc/realtime-voice", () => ({
  RealtimeVoiceSession: class MockRealtimeVoiceSession {
    connect = mockConnect;
    end = mockEnd;
    setMicEnabled = mockSetMicEnabled;
  },
}));

global.fetch = mockFetch;

describe("DialogMode Realtime Voice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    mockFetch.mockResolvedValue(
      Response.json({
        clientSecret: "ephemeral-secret",
        model: "gpt-realtime-mini",
        maxSessionSeconds: 600,
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("zeigt Transparenz und Notrufnummern vor dem ersten Sprechen", () => {
    render(<DialogMode />);

    expect(screen.getByText(/Stimme.*OpenAI/i)).toBeInTheDocument();
    expect(screen.getByText(/nicht.*gespeichert/i)).toBeInTheDocument();
    expect(screen.getByText(/112/)).toBeInTheDocument();
    expect(screen.getByText(/110/)).toBeInTheDocument();
  });

  it("startet erst nach ausdruecklicher Bestaetigung des Hinweises", async () => {
    render(<DialogMode />);
    const start = screen.getByRole("button", { name: /Gespr.*starten/i });

    expect(start).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Hinweis verstanden/i }));
    expect(start).toBeEnabled();
    fireEvent.click(start);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      "/api/voice/realtime/session",
      expect.objectContaining({ method: "POST" }),
    ));
    await waitFor(() => expect(mockConnect).toHaveBeenCalledWith(
      expect.objectContaining({
        clientSecret: "ephemeral-secret",
        model: "gpt-realtime-mini",
      }),
    ));
  });

  it("nutzt Senior-Touchziele fuer Start und Stopp", async () => {
    render(<DialogMode />);
    const start = screen.getByRole("button", { name: /Gespr.*starten/i });
    expect(start.className).toContain("min-h-[80px]");

    fireEvent.click(screen.getByRole("checkbox", { name: /Hinweis verstanden/i }));
    fireEvent.click(start);

    const stop = await screen.findByRole("button", { name: /Gespr.*beenden/i });
    expect(stop.className).toContain("min-h-[80px]");
    fireEvent.click(stop);
    expect(mockEnd).toHaveBeenCalled();
  });

  it("beendet die Sitzung clientseitig am serverseitig vorgegebenen Limit", async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValueOnce(
      Response.json({
        clientSecret: "ephemeral-secret",
        model: "gpt-realtime-mini",
        maxSessionSeconds: 1,
      }),
    );
    render(<DialogMode />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Hinweis verstanden/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Gespr.*starten/i }));
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });

    expect(mockEnd).toHaveBeenCalled();
  });
});
