// Barrel Export: Voice-Modul (Spracheingabe)
// Alle oeffentlichen Exporte fuer @/lib/voice

// Interface + Typen
export type {
  SpeechEngineState,
  SpeechEngineCallbacks,
  SpeechEngine,
} from "./speech-engine";

// Engines
export { NativeSpeechEngine } from "./native-speech-engine";
export { WhisperEngine } from "./whisper-engine";
export { createSpeechEngine } from "./create-speech-engine";

// TTS-Streaming
export type { SentenceStreamTTSOptions } from "./sentence-stream-tts";
export { SentenceStreamTTS } from "./sentence-stream-tts";

// Silence Detection
export type { SilenceDetectorOptions } from "./silence-detector";
export { SilenceDetector } from "./silence-detector";
