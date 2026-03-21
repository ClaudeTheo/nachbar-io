import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
  delete (globalThis as Record<string, unknown>).MediaRecorder;
  Object.defineProperty(globalThis, 'navigator', {
    value: { mediaDevices: undefined },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).MediaRecorder;
});

describe('createSpeechEngine (Whisper-Only)', () => {
  it('gibt WhisperEngine zurueck wenn getUserMedia + MediaRecorder verfuegbar', async () => {
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

  it('gibt null zurueck wenn getUserMedia nicht verfuegbar', async () => {
    const { createSpeechEngine } = await import('@/lib/voice/create-speech-engine');
    const engine = createSpeechEngine();
    expect(engine).toBeNull();
  });

  it('gibt null zurueck wenn nur MediaRecorder aber kein getUserMedia', async () => {
    (globalThis as Record<string, unknown>).MediaRecorder = MockMediaRecorder;

    const { createSpeechEngine } = await import('@/lib/voice/create-speech-engine');
    const engine = createSpeechEngine();
    expect(engine).toBeNull();
  });
});
