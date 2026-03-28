// modules/voice/engines/index.ts — Barrel Export fuer Voice-Engines

export type {
  SpeechEngineState,
  SpeechEngineCallbacks,
  SpeechEngine,
} from "./speech-engine";

export { NativeSpeechEngine } from "./native-speech-engine";
export { WhisperEngine } from "./whisper-engine";
export { createSpeechEngine } from "./create-speech-engine";

export type { SentenceStreamTTSOptions } from "./sentence-stream-tts";
export { SentenceStreamTTS } from "./sentence-stream-tts";

export type { SilenceDetectorOptions } from "./silence-detector";
export { SilenceDetector } from "./silence-detector";
