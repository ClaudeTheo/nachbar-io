// modules/voice/hooks/useSpeechInput.ts
// Welle C C6b — STT-Mikrofon fuer den Onboarding-Wizard.
//
// Schmaler Hook um createSpeechEngine (Whisper-First, Native-Fallback). Pattern
// uebernommen aus modules/voice/components/companion/hooks/useCompanionChat.ts
// (engineRef + useEffect-Init/Cleanup), aber als single-purpose Hook
// extrahiert, damit der WizardChat ihn unabhaengig vom Companion-Chat-State
// nutzen kann.
//
// API:
//   useSpeechInput({ onTranscript, onError? })
//     -> { isAvailable, recording, speechState, start, stop }
//
// Race-Fix mit useTtsPlayback passiert NICHT im Hook, sondern im Aufrufer:
// WizardChat ruft `tts.stop()` BEVOR `useSpeechInput.start()`, damit das
// Mikro nicht die TTS-Antwort der KI mithoert.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSpeechEngine } from "@/modules/voice/engines/create-speech-engine";
import type {
  SpeechEngine,
  SpeechEngineState,
} from "@/modules/voice/engines/speech-engine";

export interface UseSpeechInputOptions {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
}

export interface UseSpeechInputReturn {
  isAvailable: boolean;
  recording: boolean;
  speechState: SpeechEngineState;
  start: () => void;
  stop: () => void;
}

export function useSpeechInput(
  options: UseSpeechInputOptions,
): UseSpeechInputReturn {
  const [engine] = useState<SpeechEngine | null>(() => createSpeechEngine());
  const engineRef = useRef<SpeechEngine | null>(engine);
  const [isAvailable] = useState(() => engine !== null);
  const [recording, setRecording] = useState(false);
  const [speechState, setSpeechState] = useState<SpeechEngineState>("idle");

  // Optionen via Ref, damit start() nicht bei jedem Re-Render neu erzeugt wird
  // (sonst loest sich die Stable-Identitaet auf, was bei Aufruf-Throttle stoert).
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Engine einmalig beim Mount initialisieren
  useEffect(() => {
    return () => {
      engineRef.current?.cleanup();
      engineRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    // Doppel-Start verhindern: wenn schon recording, no-op.
    // (Engine selbst ist nicht reentrant in startListening.)
    // setRecording(true) ist idempotent — die Guard prueft den vorherigen Wert
    // ueber Closure-Capture beim ersten Call.
    setRecording((prev) => {
      if (prev) return prev;
      engine.startListening({
        onTranscript: (text) => {
          setRecording(false);
          setSpeechState("idle");
          optionsRef.current.onTranscript(text);
        },
        onAudioLevel: () => {
          // Fuer spaeter: Waveform-Visualisierung (nicht in C6b-Scope).
        },
        onStateChange: (state) => {
          setSpeechState(state);
          if (state === "idle") {
            setRecording(false);
          }
        },
        onError: (message) => {
          setRecording(false);
          setSpeechState("idle");
          optionsRef.current.onError?.(message);
        },
      });
      return true;
    });
  }, []);

  const stop = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.stopListening();
    setRecording(false);
    setSpeechState("idle");
  }, []);

  return { isAvailable, recording, speechState, start, stop };
}
