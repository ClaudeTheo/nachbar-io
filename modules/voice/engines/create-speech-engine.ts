// lib/voice/create-speech-engine.ts
// Factory: Native Speech API bevorzugt, Whisper als Fallback

import { NativeSpeechEngine } from './native-speech-engine';
import { WhisperEngine } from './whisper-engine';
import type { SpeechEngine } from './speech-engine';

/**
 * Erstellt die beste verfuegbare Speech Engine.
 * 1. NativeSpeechEngine (Web Speech API) — kostenlos, kein API-Aufruf
 * 2. WhisperEngine (MediaRecorder + OpenAI Whisper) — Fallback fuer iOS/Firefox
 * Gibt null zurueck wenn keine Engine verfuegbar.
 */
export function createSpeechEngine(): SpeechEngine | null {
  // Zuerst Native probieren (keine API-Kosten)
  const native = new NativeSpeechEngine();
  if (native.isAvailable()) return native;

  // Fallback: Whisper (MediaRecorder + API)
  const whisper = new WhisperEngine();
  if (whisper.isAvailable()) return whisper;

  return null;
}
