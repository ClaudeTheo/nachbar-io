'use client';

// Spracheingabe-Komponente fuer die Aufgabentafel
// Nutzt Web Speech API (SpeechRecognition) fuer Spracherkennung
// Senior-Mode: 80px Button, pulsierende rote Markierung bei Aufnahme

import { useState, useRef, useCallback, useEffect } from 'react';

// Web Speech API Typen (nicht in allen TS-Konfigurationen enthalten)
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string; confidence: number };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventLike {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionErrorLike {
  readonly error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

/** Zustaende der Spracheingabe */
type VoiceState = 'idle' | 'listening' | 'processing' | 'done' | 'error';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

/** Prueft ob die Web Speech API verfuegbar ist */
function isSpeechRecognitionAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
}

/** Erstellt eine SpeechRecognition-Instanz (mit webkit-Fallback) */
function createRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor() as SpeechRecognitionLike;
}

// Farben und Stile fuer die verschiedenen Zustaende
const STATE_STYLES: Record<VoiceState, { ring: string; bg: string; text: string }> = {
  idle:       { ring: 'ring-[#4CAF87]', bg: 'bg-[#4CAF87]/10', text: 'text-[#4CAF87]' },
  listening:  { ring: 'ring-red-500 animate-pulse', bg: 'bg-red-50', text: 'text-red-600' },
  processing: { ring: 'ring-[#F59E0B]', bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]' },
  done:       { ring: 'ring-[#4CAF87]', bg: 'bg-[#4CAF87]/10', text: 'text-[#4CAF87]' },
  error:      { ring: 'ring-red-400', bg: 'bg-red-50', text: 'text-red-500' },
};

const STATE_LABELS: Record<VoiceState, string> = {
  idle: 'Sprechen',
  listening: 'Aufnahme...',
  processing: 'Wird erkannt...',
  done: 'Erkannt ✓',
  error: 'Fehler — erneut versuchen',
};

export function VoiceInput({ onTranscript, disabled = false, className = '' }: VoiceInputProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aufraumen bei Unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignorieren */ }
      }
    };
  }, []);

  // Stille-Timer zuruecksetzen (10 Sekunden)
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      // Nach 10 Sek. Stille: Aufnahme beenden
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignorieren */ }
      }
    }, 10_000);
  }, []);

  const startListening = useCallback(() => {
    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    recognition.lang = 'de-DE';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setState('listening');
      setInterimText('');
      resetSilenceTimer();
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      resetSilenceTimer();
      let finalTranscript = '';
      let interim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimText(interim || finalTranscript);

      if (finalTranscript) {
        setState('done');
        setInterimText('');
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        onTranscript(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorLike) => {
      // "no-speech" ist kein echter Fehler — einfach zuruecksetzen
      if (event.error === 'no-speech') {
        setState('idle');
      } else {
        setState('error');
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    recognition.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      // Nur zuruecksetzen wenn wir noch im listening-State sind (kein Ergebnis kam)
      setState((prev) => (prev === 'listening' ? 'idle' : prev));
    };

    try {
      recognition.start();
    } catch {
      setState('error');
    }
  }, [onTranscript, resetSilenceTimer]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignorieren */ }
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  const handleClick = useCallback(() => {
    if (state === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  }, [state, startListening, stopListening]);

  // Graceful Degradation: Nichts rendern wenn API nicht verfuegbar
  if (!isSpeechRecognitionAvailable()) {
    return null;
  }

  const styles = STATE_STYLES[state];
  const label = STATE_LABELS[state];
  const isListening = state === 'listening';

  return (
    <div className={`space-y-2 ${className}`} data-testid="voice-input">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || state === 'processing'}
        aria-label={isListening ? 'Aufnahme stoppen' : 'Spracheingabe starten'}
        className={`flex items-center justify-center gap-3 w-full rounded-xl border-2 ${styles.bg} ${styles.text} ring-2 ${styles.ring} font-medium text-base transition-all disabled:opacity-50`}
        style={{ minHeight: '80px', touchAction: 'manipulation' }}
      >
        {/* Mikrofon-Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-7 w-7"
          aria-hidden="true"
        >
          <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4Z" />
          <path d="M6 10a1 1 0 0 0-2 0 8 8 0 0 0 7 7.93V21H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-3.07A8 8 0 0 0 20 10a1 1 0 1 0-2 0 6 6 0 0 1-12 0Z" />
        </svg>
        <span>{label}</span>
      </button>

      {/* Interim-Text waehrend der Aufnahme anzeigen */}
      {interimText && (
        <p className="text-sm text-muted-foreground italic px-1" data-testid="voice-interim">
          „{interimText}"
        </p>
      )}
    </div>
  );
}
