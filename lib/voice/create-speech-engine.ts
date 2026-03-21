// lib/voice/create-speech-engine.ts
// Factory: Whisper-Only Speech Backend (alle Plattformen)

import { WhisperEngine } from './whisper-engine';
import type { SpeechEngine } from './speech-engine';

/**
 * Erstellt die WhisperEngine (MediaRecorder + OpenAI Whisper API).
 * Einheitliches Backend fuer iOS, Android und Desktop.
 * Gibt null zurueck wenn getUserMedia nicht verfuegbar.
 */
export function createSpeechEngine(): SpeechEngine | null {
  const whisper = new WhisperEngine();
  if (whisper.isAvailable()) return whisper;
  return null;
}
