import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { DialogMode } from "@/modules/voice/components/companion/DialogMode";

// Mock voice-Module (brauchen Browser-APIs)
vi.mock("@/modules/voice/engines/create-speech-engine", () => ({
  createSpeechEngine: vi.fn().mockReturnValue(null),
}));

vi.mock("@/modules/voice/engines/silence-detector", () => {
  const SilenceDetector = vi.fn().mockImplementation(function (
    this: Record<string, unknown>,
  ) {
    this.feedAudioLevel = vi.fn();
    this.reset = vi.fn();
    this.cleanup = vi.fn();
    this.currentLevel = 0;
  });
  return { SilenceDetector };
});

vi.mock("@/modules/voice/engines/sentence-stream-tts", () => {
  const SentenceStreamTTS = vi.fn().mockImplementation(function (
    this: Record<string, unknown>,
  ) {
    this.feedText = vi.fn().mockReturnValue([]);
    this.flush = vi.fn().mockReturnValue([]);
    this.speakSentence = vi.fn().mockResolvedValue(undefined);
    this.playQueue = vi.fn().mockResolvedValue(undefined);
    this.stop = vi.fn();
  });
  return { SentenceStreamTTS };
});

vi.mock("@/hooks/useStreamingChat", () => ({
  useStreamingChat: vi.fn().mockReturnValue({
    streamingText: "",
    isStreaming: false,
    error: null,
    sendStreaming: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
  }),
}));

describe("DialogMode", () => {
  afterEach(() => cleanup());
  it('zeigt "Gespräch starten" Button initial', () => {
    render(<DialogMode onMessage={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /Gespräch starten/i }),
    ).toBeInTheDocument();
  });

  it("Button ist mindestens 80px hoch (Senior-Modus)", () => {
    render(<DialogMode onMessage={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /Gespräch starten/i });
    expect(btn.className).toContain("min-h-[80px]");
  });

  it("zeigt Stopp-Button nach Start", () => {
    render(<DialogMode onMessage={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Gespräch starten/i }));
    expect(screen.getByRole("button", { name: /Stopp/i })).toBeInTheDocument();
  });

  it("Stopp-Button ist 80px hoch", () => {
    render(<DialogMode onMessage={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Gespräch starten/i }));
    const stopBtn = screen.getByRole("button", { name: /Stopp/i });
    expect(stopBtn.className).toContain("min-h-[80px]");
  });

  it("zeigt Text-Fallback Eingabefeld waehrend Dialog", () => {
    render(<DialogMode onMessage={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Gespräch starten/i }));
    expect(screen.getByPlaceholderText(/Text eingeben/i)).toBeInTheDocument();
  });

  it("Stopp kehrt zu Start-Button zurueck", () => {
    render(<DialogMode onMessage={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Gespräch starten/i }));
    fireEvent.click(screen.getByRole("button", { name: /Stopp/i }));
    expect(
      screen.getByRole("button", { name: /Gespräch starten/i }),
    ).toBeInTheDocument();
  });
});
