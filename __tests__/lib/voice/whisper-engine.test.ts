import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fuer getUserMedia + AudioContext + MediaRecorder
const mockGetUserMedia = vi.fn();
const mockGetByteFrequencyData = vi.fn();
const mockFetch = vi.fn();

class MockAnalyserNode {
  frequencyBinCount = 128;
  fftSize = 256;
  connect = vi.fn();
  disconnect = vi.fn();
  getByteFrequencyData = mockGetByteFrequencyData;
}

class MockMediaStreamSource {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioContext {
  state = "running";
  createAnalyser() {
    return new MockAnalyserNode();
  }
  createMediaStreamSource() {
    return new MockMediaStreamSource();
  }
  close = vi.fn();
}

// MediaRecorder Mock
let mockMediaRecorderInstance: MockMediaRecorder | null = null;

class MockMediaRecorder {
  state = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    mockMediaRecorderInstance = this;
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    // Simuliere Daten-Event
    this.ondataavailable?.({
      data: new Blob(["audio-data"], { type: "audio/webm" }),
    });
    this.onstop?.();
  }

  static isTypeSupported() {
    return true;
  }
}

const mockTrackStop = vi.fn();
const mockStream = { getTracks: () => [{ stop: mockTrackStop }] };

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mockMediaRecorderInstance = null;

  Object.defineProperty(globalThis, "navigator", {
    value: { mediaDevices: { getUserMedia: mockGetUserMedia } },
    writable: true,
    configurable: true,
  });

  (globalThis as Record<string, unknown>).AudioContext = MockAudioContext;
  (globalThis as Record<string, unknown>).MediaRecorder = MockMediaRecorder;
  global.fetch = mockFetch;

  vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => 1);
  vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).AudioContext;
  delete (globalThis as Record<string, unknown>).MediaRecorder;
});

describe("WhisperEngine", () => {
  it("isAvailable() gibt true zurueck wenn getUserMedia + MediaRecorder existiert", async () => {
    const { WhisperEngine } = await import("@/lib/voice/whisper-engine");
    const engine = new WhisperEngine();
    expect(engine.isAvailable()).toBe(true);
  });

  it("isAvailable() gibt false zurueck wenn getUserMedia fehlt", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { mediaDevices: undefined },
      writable: true,
      configurable: true,
    });

    const { WhisperEngine } = await import("@/lib/voice/whisper-engine");
    const engine = new WhisperEngine();
    expect(engine.isAvailable()).toBe(false);
  });

  it("startListening() startet MediaRecorder + AudioContext", async () => {
    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    const { WhisperEngine } = await import("@/lib/voice/whisper-engine");
    const engine = new WhisperEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);

    await vi.waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    expect(callbacks.onStateChange).toHaveBeenCalledWith("listening");
  });

  it("stopListening() stoppt MediaRecorder und sendet Audio an /api/voice/transcribe", async () => {
    mockGetUserMedia.mockResolvedValueOnce(mockStream);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "Hilfe beim Einkaufen" }),
    });

    const { WhisperEngine } = await import("@/lib/voice/whisper-engine");
    const engine = new WhisperEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);

    await vi.waitFor(() => {
      expect(callbacks.onStateChange).toHaveBeenCalledWith("listening");
    });

    engine.stopListening();

    await vi.waitFor(() => {
      expect(callbacks.onStateChange).toHaveBeenCalledWith("processing");
    });

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/voice/transcribe",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await vi.waitFor(() => {
      expect(callbacks.onTranscript).toHaveBeenCalledWith(
        "Hilfe beim Einkaufen",
      );
    });
  });

  it("respektiert 30-Sekunden-Limit", async () => {
    vi.useFakeTimers();
    mockGetUserMedia.mockResolvedValueOnce(mockStream);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "Timeout-Text" }),
    });

    const { WhisperEngine } = await import("@/lib/voice/whisper-engine");
    const engine = new WhisperEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);

    // getUserMedia Promise aufloesen
    await vi.advanceTimersByTimeAsync(100);

    // 30 Sekunden vorruecken — Timer soll stop ausloesen
    vi.advanceTimersByTime(30_100);

    // MediaRecorder.stop() wurde durch Timer aufgerufen
    expect(mockMediaRecorderInstance?.state).toBe("inactive");

    vi.useRealTimers();
  });

  it("ruft onError bei getUserMedia-Verweigerung auf", async () => {
    mockGetUserMedia.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError"),
    );

    const { WhisperEngine } = await import("@/lib/voice/whisper-engine");
    const engine = new WhisperEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);

    await vi.waitFor(() => {
      expect(callbacks.onError).toHaveBeenCalled();
    });

    const errorMsg = callbacks.onError.mock.calls[0][0];
    expect(errorMsg).toContain("Mikrofon");
  });

  it("iOS-Fallback: transkribiert nach 2s Timeout wenn onstop nicht feuert", async () => {
    vi.useFakeTimers();
    mockGetUserMedia.mockResolvedValueOnce(mockStream);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "Hallo" }),
    });

    const { WhisperEngine } = await import("@/lib/voice/whisper-engine");
    const engine = new WhisperEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);

    // getUserMedia Promise aufloesen
    await vi.advanceTimersByTimeAsync(100);

    expect(mockMediaRecorderInstance).not.toBeNull();

    // Simuliere dass ondataavailable Daten liefert
    mockMediaRecorderInstance!.ondataavailable?.({
      data: new Blob(["audio"], { type: "audio/webm" }),
    });

    // stop() ueberschreiben — onstop feuert NICHT (iOS-Bug)
    mockMediaRecorderInstance!.stop = vi.fn(() => {
      mockMediaRecorderInstance!.state = "inactive";
      // onstop wird absichtlich NICHT aufgerufen
    });

    engine.stopListening();

    // 2s Timeout abwarten
    await vi.advanceTimersByTimeAsync(2100);

    // Fallback sollte transcribe aufgerufen haben
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/voice/transcribe",
      expect.objectContaining({ method: "POST" }),
    );

    vi.useRealTimers();
  });

  it("iOS-Fallback: ruft onError wenn keine Chunks und onstop nicht feuert", async () => {
    vi.useFakeTimers();
    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    const { WhisperEngine } = await import("@/lib/voice/whisper-engine");
    const engine = new WhisperEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);
    await vi.advanceTimersByTimeAsync(100);

    // stop() ueberschreiben — onstop feuert NICHT, keine Chunks vorhanden
    mockMediaRecorderInstance!.stop = vi.fn(() => {
      mockMediaRecorderInstance!.state = "inactive";
    });

    engine.stopListening();
    await vi.advanceTimersByTimeAsync(2100);

    expect(callbacks.onError).toHaveBeenCalledWith(
      "Aufnahme konnte nicht verarbeitet werden.",
    );
    expect(callbacks.onStateChange).toHaveBeenCalledWith("idle");

    vi.useRealTimers();
  });

  it("normaler Stop raeumt Fallback-Timer auf", async () => {
    vi.useFakeTimers();
    mockGetUserMedia.mockResolvedValueOnce(mockStream);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "Normal" }),
    });

    const { WhisperEngine } = await import("@/lib/voice/whisper-engine");
    const engine = new WhisperEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);
    await vi.advanceTimersByTimeAsync(100);

    engine.stopListening();

    // onstop sofort feuern (normales Verhalten) — passiert im Mock automatisch via stop()
    // fetch sollte genau 1x aufgerufen werden (nicht 2x durch Fallback)
    await vi.advanceTimersByTimeAsync(2100);

    // Nur ein einziger fetch-Aufruf (kein doppelter durch Fallback)
    expect(mockFetch).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("ruft onError bei Whisper-API-Fehler auf", async () => {
    mockGetUserMedia.mockResolvedValueOnce(mockStream);
    mockFetch.mockResolvedValueOnce({ ok: false, status: 502 });

    const { WhisperEngine } = await import("@/lib/voice/whisper-engine");
    const engine = new WhisperEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);

    await vi.waitFor(() => {
      expect(callbacks.onStateChange).toHaveBeenCalledWith("listening");
    });

    engine.stopListening();

    await vi.waitFor(() => {
      expect(callbacks.onError).toHaveBeenCalled();
    });
  });
});
