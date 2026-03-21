import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock SpeechRecognition
class MockSpeechRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  onstart = null;
  onresult = null;
  onerror = null;
  onend = null;
  start() {}
  stop() {}
  abort() {}
}

function enableSpeechRecognition() {
  (globalThis as Record<string, unknown>).SpeechRecognition = MockSpeechRecognition;
}

function disableSpeechRecognition() {
  delete (globalThis as Record<string, unknown>).SpeechRecognition;
  delete (globalThis as Record<string, unknown>).webkitSpeechRecognition;
}

// Mock MediaRecorder
class MockMediaRecorder {
  state = 'inactive';
  ondataavailable = null;
  onstop = null;
  onerror = null;
  start() {}
  stop() {}
  static isTypeSupported() { return true; }
}

beforeEach(() => {
  vi.resetModules();
  disableSpeechRecognition();
  delete (globalThis as Record<string, unknown>).MediaRecorder;

  Object.defineProperty(globalThis, 'navigator', {
    value: { mediaDevices: undefined },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  disableSpeechRecognition();
  delete (globalThis as Record<string, unknown>).MediaRecorder;
});

describe('createSpeechEngine', () => {
  it('gibt WebSpeechEngine zurueck wenn SpeechRecognition verfuegbar', async () => {
    enableSpeechRecognition();

    const { createSpeechEngine } = await import('@/lib/voice/create-speech-engine');
    const engine = createSpeechEngine();

    expect(engine).not.toBeNull();
    // WebSpeechEngine hat isAvailable() === true
    expect(engine!.isAvailable()).toBe(true);
  });

  it('gibt WhisperEngine zurueck wenn nur getUserMedia verfuegbar', async () => {
    disableSpeechRecognition();

    // getUserMedia + MediaRecorder verfuegbar
    Object.defineProperty(globalThis, 'navigator', {
      value: { mediaDevices: { getUserMedia: vi.fn() } },
      writable: true,
      configurable: true,
    });
    (globalThis as Record<string, unknown>).MediaRecorder = MockMediaRecorder;

    const { createSpeechEngine } = await import('@/lib/voice/create-speech-engine');
    const engine = createSpeechEngine();

    expect(engine).not.toBeNull();
    expect(engine!.isAvailable()).toBe(true);
  });

  it('gibt null zurueck wenn nichts verfuegbar', async () => {
    disableSpeechRecognition();
    // Kein getUserMedia, kein MediaRecorder

    const { createSpeechEngine } = await import('@/lib/voice/create-speech-engine');
    const engine = createSpeechEngine();

    expect(engine).toBeNull();
  });
});
