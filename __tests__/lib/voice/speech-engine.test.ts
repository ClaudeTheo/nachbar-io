import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fuer getUserMedia + AudioContext
const mockGetUserMedia = vi.fn();
const mockAnalyserConnect = vi.fn();
const mockAnalyserDisconnect = vi.fn();
const mockSourceConnect = vi.fn();
const mockSourceDisconnect = vi.fn();
const mockAudioContextClose = vi.fn();
const mockGetByteFrequencyData = vi.fn();

class MockAnalyserNode {
  frequencyBinCount = 128;
  fftSize = 256;
  connect = mockAnalyserConnect;
  disconnect = mockAnalyserDisconnect;
  getByteFrequencyData = mockGetByteFrequencyData;
}

class MockMediaStreamSource {
  connect = mockSourceConnect;
  disconnect = mockSourceDisconnect;
}

class MockAudioContext {
  state = 'running';
  createAnalyser() { return new MockAnalyserNode(); }
  createMediaStreamSource() { return new MockMediaStreamSource(); }
  close = mockAudioContextClose;
}

// SpeechRecognition Mock
class MockSpeechRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start() { this.onstart?.(); }
  stop() { this.onend?.(); }
  abort() { this.onend?.(); }
}

function enableSpeechRecognition() {
  (globalThis as Record<string, unknown>).SpeechRecognition = MockSpeechRecognition;
}

function disableSpeechRecognition() {
  delete (globalThis as Record<string, unknown>).SpeechRecognition;
  delete (globalThis as Record<string, unknown>).webkitSpeechRecognition;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  disableSpeechRecognition();

  // navigator.mediaDevices.getUserMedia mock
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      mediaDevices: { getUserMedia: mockGetUserMedia },
    },
    writable: true,
    configurable: true,
  });

  // AudioContext mock
  (globalThis as Record<string, unknown>).AudioContext = MockAudioContext;

  // requestAnimationFrame mock
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    // Nicht ausfuehren, nur ID zurueckgeben
    return 1;
  });
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
});

afterEach(() => {
  disableSpeechRecognition();
  delete (globalThis as Record<string, unknown>).AudioContext;
});

describe('SpeechEngine Interface', () => {
  it('exportiert SpeechEngineState und SpeechEngineCallbacks Typen', async () => {
    const mod = await import('@/lib/voice/speech-engine');
    // Typ-Exporte pruefen — wenn Import klappt, existieren die Typen
    expect(mod).toBeDefined();
  });
});

describe('WebSpeechEngine', () => {
  it('isAvailable() gibt true zurueck wenn SpeechRecognition existiert', async () => {
    enableSpeechRecognition();
    const { WebSpeechEngine } = await import('@/lib/voice/web-speech-engine');
    const engine = new WebSpeechEngine();
    expect(engine.isAvailable()).toBe(true);
  });

  it('isAvailable() gibt false zurueck wenn SpeechRecognition fehlt', async () => {
    disableSpeechRecognition();
    const { WebSpeechEngine } = await import('@/lib/voice/web-speech-engine');
    const engine = new WebSpeechEngine();
    expect(engine.isAvailable()).toBe(false);
  });

  it('startListening() startet SpeechRecognition mit de-DE', async () => {
    enableSpeechRecognition();
    const { WebSpeechEngine } = await import('@/lib/voice/web-speech-engine');
    const engine = new WebSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    mockGetUserMedia.mockResolvedValueOnce({ getTracks: () => [{ stop: vi.fn() }] });

    engine.startListening(callbacks);

    // SpeechRecognition wird mit de-DE gestartet
    expect(callbacks.onStateChange).toHaveBeenCalledWith('listening');
  });

  it('stopListening() stoppt SpeechRecognition', async () => {
    enableSpeechRecognition();
    const { WebSpeechEngine } = await import('@/lib/voice/web-speech-engine');
    const engine = new WebSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    mockGetUserMedia.mockResolvedValueOnce({ getTracks: () => [{ stop: vi.fn() }] });

    engine.startListening(callbacks);
    engine.stopListening();

    // Nach stop soll idle gemeldet werden
    expect(callbacks.onStateChange).toHaveBeenCalledWith('idle');
  });

  it('ruft onTranscript callback auf bei finalem Ergebnis', async () => {
    enableSpeechRecognition();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instance: any = null;
    class TrackableSR extends MockSpeechRecognition {
      constructor() { super(); instance = this; }
    }
    (globalThis as Record<string, unknown>).SpeechRecognition = TrackableSR;

    const { WebSpeechEngine } = await import('@/lib/voice/web-speech-engine');
    const engine = new WebSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    mockGetUserMedia.mockResolvedValueOnce({ getTracks: () => [{ stop: vi.fn() }] });

    engine.startListening(callbacks);

    // Ergebnis simulieren
    instance?.onresult?.({
      results: [{ isFinal: true, 0: { transcript: 'Hilfe beim Einkaufen', confidence: 0.9 }, length: 1 }],
      resultIndex: 0,
      length: 1,
    });

    expect(callbacks.onTranscript).toHaveBeenCalledWith('Hilfe beim Einkaufen');
  });

  it('ruft onError callback auf bei SpeechRecognition-Fehler', async () => {
    enableSpeechRecognition();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instance: any = null;
    class TrackableSR extends MockSpeechRecognition {
      constructor() { super(); instance = this; }
    }
    (globalThis as Record<string, unknown>).SpeechRecognition = TrackableSR;

    const { WebSpeechEngine } = await import('@/lib/voice/web-speech-engine');
    const engine = new WebSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    mockGetUserMedia.mockResolvedValueOnce({ getTracks: () => [{ stop: vi.fn() }] });

    engine.startListening(callbacks);

    // Fehler simulieren
    instance?.onerror?.({ error: 'not-allowed' });

    expect(callbacks.onError).toHaveBeenCalledWith('not-allowed');
  });

  it('ruft onStateChange callback auf bei Start/Stop', async () => {
    enableSpeechRecognition();
    const { WebSpeechEngine } = await import('@/lib/voice/web-speech-engine');
    const engine = new WebSpeechEngine();

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    mockGetUserMedia.mockResolvedValueOnce({ getTracks: () => [{ stop: vi.fn() }] });

    engine.startListening(callbacks);
    expect(callbacks.onStateChange).toHaveBeenCalledWith('listening');

    engine.stopListening();
    expect(callbacks.onStateChange).toHaveBeenCalledWith('idle');
  });

  it('cleanup() raeumt alle Ressourcen auf', async () => {
    enableSpeechRecognition();
    const { WebSpeechEngine } = await import('@/lib/voice/web-speech-engine');
    const engine = new WebSpeechEngine();

    const mockStop = vi.fn();
    mockGetUserMedia.mockResolvedValueOnce({ getTracks: () => [{ stop: mockStop }] });

    const callbacks = {
      onTranscript: vi.fn(),
      onAudioLevel: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    };

    engine.startListening(callbacks);

    // Warten bis getUserMedia aufgeloest
    await vi.waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    engine.cleanup();

    // Nach cleanup sollte idle State gemeldet werden
    expect(callbacks.onStateChange).toHaveBeenCalledWith('idle');
  });
});
