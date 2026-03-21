// lib/voice/create-speech-engine.ts
// Factory: Waehlt das beste verfuegbare Speech Backend

import { WebSpeechEngine } from './web-speech-engine';
import { WhisperEngine } from './whisper-engine';
import type { SpeechEngine } from './speech-engine';

/**
 * Erstellt die beste verfuegbare Speech Engine:
 * 1. Web Speech API (kostenlos, Chrome/Edge/Android)
 * 2. Whisper via MediaRecorder (Fallback fuer iOS/Firefox)
 * 3. null wenn nichts verfuegbar (FAB wird nicht gerendert)
 */
export function createSpeechEngine(): SpeechEngine | null {
  const webSpeech = new WebSpeechEngine();
  if (webSpeech.isAvailable()) return webSpeech;

  const whisper = new WhisperEngine();
  if (whisper.isAvailable()) return whisper;

  return null;
}
