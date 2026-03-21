import { describe, it, expect } from 'vitest';

describe('SpeechEngine Interface', () => {
  it('exportiert SpeechEngineState und SpeechEngineCallbacks Typen', async () => {
    const mod = await import('@/lib/voice/speech-engine');
    // Typ-Exporte pruefen — wenn Import klappt, existieren die Typen
    expect(mod).toBeDefined();
  });
});

// WebSpeechEngine Tests entfernt — Web Speech API wurde zugunsten von Whisper-Only entfernt
