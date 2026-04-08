// lib/voice/create-speech-engine.ts
// Factory: MediaRecorder+Whisper bevorzugt (96% Coverage), Native als Fallback

import { NativeSpeechEngine } from './native-speech-engine';
import { WhisperEngine } from './whisper-engine';
import type { SpeechEngine } from './speech-engine';

/**
 * Erstellt die beste verfuegbare Speech Engine.
 * 1. WhisperEngine (MediaRecorder + OpenAI Whisper) — 96% Browser-Coverage, iOS PWA funktioniert
 * 2. NativeSpeechEngine (Web Speech API) — Fallback fuer Browser ohne MediaRecorder
 * Gibt null zurueck wenn keine Engine verfuegbar.
 *
 * Begruendung fuer Whisper-First (Session 59, Design-Dokument):
 * - Web Speech API hat nur ~55% effektive Coverage (iOS PWA broken, Edge broken, Firefox nicht unterstuetzt)
 * - MediaRecorder hat 96.46% Coverage und funktioniert in iOS Safari PWA, Edge, Firefox
 * - Whisper liefert konsistentere Qualitaet als browserspezifische Erkennung
 * - Kosten: ~$0.006/min (akzeptabel fuer Pilot)
 */
export function createSpeechEngine(): SpeechEngine | null {
  // Primaer: MediaRecorder + Whisper (beste Coverage, konsistente Qualitaet)
  const whisper = new WhisperEngine();
  if (whisper.isAvailable()) return whisper;

  // Fallback: Native Web Speech API (keine API-Kosten, aber eingeschraenkte Coverage)
  const native = new NativeSpeechEngine();
  if (native.isAvailable()) return native;

  return null;
}
