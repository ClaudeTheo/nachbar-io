import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock SpeechRecognition Instanz
let mockRecognitionInstance: MockSpeechRecognition | null = null;

class MockSpeechRecognition {
  lang = "";
  interimResults = false;
  continuous = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    mockRecognitionInstance = this;
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mockRecognitionInstance = null;

  // SpeechRecognition standardmaessig verfuegbar machen
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = globalThis;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).SpeechRecognition = MockSpeechRecognition;
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).SpeechRecognition;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).webkitSpeechRecognition;
});

describe("NativeSpeechEngine", () => {
  it("isAvailable() gibt true zurueck wenn SpeechRecognition existiert", async () => {
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();
    expect(engine.isAvailable()).toBe(true);
  });

  it("isAvailable() gibt true zurueck wenn webkitSpeechRecognition existiert", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).SpeechRecognition;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).webkitSpeechRecognition = MockSpeechRecognition;

    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();
    expect(engine.isAvailable()).toBe(true);
  });

  it("isAvailable() gibt false zurueck wenn SpeechRecognition fehlt", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).SpeechRecognition;

    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();
    expect(engine.isAvailable()).toBe(false);
  });

  it("setzt Sprache auf de-DE", async () => {
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);

    expect(mockRecognitionInstance).not.toBeNull();
    expect(mockRecognitionInstance!.lang).toBe("de-DE");
    expect(mockRecognitionInstance!.interimResults).toBe(true);
    expect(mockRecognitionInstance!.continuous).toBe(false);
  });

  it("startListening() setzt State auf listening", async () => {
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);

    expect(mockRecognitionInstance!.start).toHaveBeenCalled();
    expect(callbacks.onStateChange).toHaveBeenCalledWith("listening");
  });

  it("leitet finales Transkript an onTranscript weiter", async () => {
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);

    // Simuliere finales Ergebnis
    const mockEvent = {
      results: [
        {
          isFinal: true,
          length: 1,
          0: { transcript: "Hilfe beim Einkaufen", confidence: 0.95 },
          item(i: number) {
            return this[i as unknown as keyof typeof this];
          },
        },
      ],
      resultIndex: 0,
    };

    mockRecognitionInstance!.onresult?.(mockEvent);

    expect(callbacks.onTranscript).toHaveBeenCalledWith("Hilfe beim Einkaufen");
  });

  it("ignoriert Interim-Ergebnisse fuer onTranscript, nutzt sie fuer Audio-Level", async () => {
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);

    // Simuliere Interim-Ergebnis
    const mockEvent = {
      results: [
        {
          isFinal: false,
          length: 1,
          0: { transcript: "Hilfe", confidence: 0.5 },
          item(i: number) {
            return this[i as unknown as keyof typeof this];
          },
        },
      ],
      resultIndex: 0,
    };

    mockRecognitionInstance!.onresult?.(mockEvent);

    // Kein Transkript bei Interim
    expect(callbacks.onTranscript).not.toHaveBeenCalled();
    // Aber Audio-Level wurde aktualisiert
    expect(callbacks.onAudioLevel).toHaveBeenCalled();
    const level = callbacks.onAudioLevel.mock.calls[0][0];
    expect(level).toBeGreaterThan(0);
    expect(level).toBeLessThanOrEqual(1);
  });

  it("uebersetzt not-allowed Fehler in deutsche Meldung", async () => {
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);

    // Simuliere Mikrofon-Verweigerung
    mockRecognitionInstance!.onerror?.({ error: "not-allowed" });

    expect(callbacks.onError).toHaveBeenCalledWith(
      "Bitte Mikrofon freigeben in den Browser-Einstellungen.",
    );
    expect(callbacks.onStateChange).toHaveBeenCalledWith("idle");
  });

  it("uebersetzt no-speech Fehler korrekt", async () => {
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);
    mockRecognitionInstance!.onerror?.({ error: "no-speech" });

    expect(callbacks.onError).toHaveBeenCalledWith(
      "Keine Sprache erkannt. Bitte nochmal versuchen.",
    );
  });

  it("uebersetzt audio-capture Fehler korrekt", async () => {
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);
    mockRecognitionInstance!.onerror?.({ error: "audio-capture" });

    expect(callbacks.onError).toHaveBeenCalledWith("Kein Mikrofon gefunden.");
  });

  it("uebersetzt network Fehler korrekt", async () => {
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);
    mockRecognitionInstance!.onerror?.({ error: "network" });

    expect(callbacks.onError).toHaveBeenCalledWith(
      "Netzwerkfehler bei der Spracherkennung.",
    );
  });

  it("ignoriert aborted-Fehler (manueller Stop)", async () => {
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);
    callbacks.onError.mockClear();
    callbacks.onStateChange.mockClear();

    mockRecognitionInstance!.onerror?.({ error: "aborted" });

    // Aborted wird ignoriert — kein Error-Callback
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  it("stopListening() ruft recognition.stop() auf", async () => {
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);
    engine.stopListening();

    expect(mockRecognitionInstance!.stop).toHaveBeenCalled();
  });

  it("cleanup() stoppt und raeumt Referenzen auf", async () => {
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);
    engine.cleanup();

    expect(mockRecognitionInstance!.stop).toHaveBeenCalled();

    // Nach cleanup: erneuter stopListening sollte keinen Fehler werfen
    expect(() => engine.stopListening()).not.toThrow();
  });

  it("onend setzt State auf idle und Audio-Level auf 0", async () => {
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);
    callbacks.onStateChange.mockClear();

    // Simuliere Ende der Erkennung
    mockRecognitionInstance!.onend?.();

    expect(callbacks.onAudioLevel).toHaveBeenCalledWith(0);
    expect(callbacks.onStateChange).toHaveBeenCalledWith("idle");
  });

  // --- BUG-07 Regressions-Tests: Timeout-Schutz gegen iOS Safari Freeze ---

  it("feuert Timeout nach 10s ohne Ergebnis und ruft abort()", async () => {
    vi.useFakeTimers();
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);
    callbacks.onStateChange.mockClear();
    callbacks.onError.mockClear();

    // 10 Sekunden vergehen ohne Ergebnis
    vi.advanceTimersByTime(10_000);

    expect(mockRecognitionInstance!.abort).toHaveBeenCalled();
    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.stringContaining("Keine Sprache erkannt"),
    );
    expect(callbacks.onAudioLevel).toHaveBeenCalledWith(0);
    expect(callbacks.onStateChange).toHaveBeenCalledWith("idle");

    vi.useRealTimers();
  });

  it("setzt Timeout bei Interim-Ergebnis zurueck", async () => {
    vi.useFakeTimers();
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);

    // 8 Sekunden vergehen
    vi.advanceTimersByTime(8_000);

    // Interim-Ergebnis kommt — Timeout sollte zurueckgesetzt werden
    const interimEvent = {
      results: [{
        isFinal: false,
        length: 1,
        0: { transcript: "Hallo", confidence: 0.5 },
        item(i: number) { return this[i as unknown as keyof typeof this]; },
      }],
      resultIndex: 0,
    };
    mockRecognitionInstance!.onresult?.(interimEvent);

    // Weitere 5 Sekunden (insgesamt 13s seit Start, aber nur 5s seit Reset)
    vi.advanceTimersByTime(5_000);

    // Kein Timeout — weil Reset nach Interim
    expect(callbacks.onError).not.toHaveBeenCalled();

    // Noch 5 Sekunden → jetzt Timeout (10s seit letztem Interim)
    vi.advanceTimersByTime(5_000);
    expect(callbacks.onError).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("loescht Timeout bei finalem Ergebnis", async () => {
    vi.useFakeTimers();
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);

    // Finales Ergebnis kommt nach 3 Sekunden
    vi.advanceTimersByTime(3_000);
    const finalEvent = {
      results: [{
        isFinal: true,
        length: 1,
        0: { transcript: "Hilfe", confidence: 0.95 },
        item(i: number) { return this[i as unknown as keyof typeof this]; },
      }],
      resultIndex: 0,
    };
    mockRecognitionInstance!.onresult?.(finalEvent);

    expect(callbacks.onTranscript).toHaveBeenCalledWith("Hilfe");

    // 10 weitere Sekunden → kein Timeout weil clearTimeout bei isFinal
    vi.advanceTimersByTime(10_000);
    expect(callbacks.onError).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("loescht Timeout bei stopListening()", async () => {
    vi.useFakeTimers();
    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);
    callbacks.onError.mockClear();

    engine.stopListening();

    // 10 Sekunden vergehen → kein Timeout weil gestoppt
    vi.advanceTimersByTime(10_000);
    expect(callbacks.onError).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("ruft onError wenn SpeechRecognition nicht verfuegbar", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).SpeechRecognition;

    const { NativeSpeechEngine } =
      await import("@/modules/voice/engines/native-speech-engine");
    const engine = new NativeSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);

    expect(callbacks.onError).toHaveBeenCalledWith(
      "Spracherkennung nicht verfügbar in diesem Browser.",
    );
  });
});
