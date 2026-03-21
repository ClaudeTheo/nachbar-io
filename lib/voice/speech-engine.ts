// lib/voice/speech-engine.ts
// Unified Speech Engine Interface — gleiche API fuer Web Speech + Whisper

/** Zustaende der Speech Engine */
export type SpeechEngineState = 'idle' | 'listening' | 'processing';

/** Callbacks die von der Engine aufgerufen werden */
export interface SpeechEngineCallbacks {
  onTranscript: (text: string) => void;
  onAudioLevel: (level: number) => void;   // 0-1, fuer Waveform
  onStateChange: (state: SpeechEngineState) => void;
  onError: (message: string) => void;
}

/** Gemeinsames Interface fuer alle Speech Backends */
export interface SpeechEngine {
  isAvailable(): boolean;
  startListening(callbacks: SpeechEngineCallbacks): void;
  stopListening(): void;
  cleanup(): void;
}
