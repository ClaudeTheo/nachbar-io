// lib/voice/native-speech-engine.ts
// Browser-native Web Speech API Engine — bevorzugt, da keine API-Aufrufe noetig

import type { SpeechEngine, SpeechEngineCallbacks } from './speech-engine';

/** Typen fuer die Web Speech API (nicht in allen TS-Versionen enthalten) */
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

/** Deutsche Fehlermeldungen fuer Web Speech API Fehler */
const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Bitte Mikrofon freigeben in den Browser-Einstellungen.',
  'no-speech': 'Keine Sprache erkannt. Bitte nochmal versuchen.',
  'audio-capture': 'Kein Mikrofon gefunden.',
  'network': 'Netzwerkfehler bei der Spracherkennung.',
};

/** Fallback-Fehlermeldung */
const DEFAULT_ERROR = 'Spracherkennung fehlgeschlagen. Bitte erneut versuchen.';

/**
 * Browser-native Spracherkennung via Web Speech API.
 * Bevorzugtes Backend — keine API-Aufrufe, keine Kosten.
 * Unterstuetzt Chrome, Edge, Safari (mit webkit-Prefix).
 */
/** Maximale Wartezeit bis Ergebnis oder Timeout (iOS Safari haengt sonst) */
const RECOGNITION_TIMEOUT_MS = 10_000;

export class NativeSpeechEngine implements SpeechEngine {
  private recognition: SpeechRecognitionInstance | null = null;
  private callbacks: SpeechEngineCallbacks | null = null;
  private isListeningActive = false;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  /** Prueft ob SpeechRecognition im Browser verfuegbar ist */
  isAvailable(): boolean {
    return this.getSpeechRecognitionConstructor() !== null;
  }

  /** Startet die Spracherkennung */
  startListening(callbacks: SpeechEngineCallbacks): void {
    const SRConstructor = this.getSpeechRecognitionConstructor();
    if (!SRConstructor) {
      callbacks.onError('Spracherkennung nicht verfügbar in diesem Browser.');
      return;
    }

    this.callbacks = callbacks;
    this.isListeningActive = true;

    const recognition = new SRConstructor();
    this.recognition = recognition;

    // Konfiguration: Deutsch, Zwischenergebnisse fuer Audio-Level-Simulation
    recognition.lang = 'de-DE';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Timeout bei jedem Zwischenergebnis zuruecksetzen (User spricht noch)
      this.resetTimeout(callbacks);

      // Audio-Level aus Zwischenergebnissen simulieren (Web Speech API hat kein echtes Audio-Level)
      const lastResult = event.results[event.results.length - 1];
      if (lastResult && !lastResult.isFinal) {
        // Interim-Ergebnis → simulierter Audio-Level basierend auf Textlaenge
        const transcript = lastResult[0]?.transcript || '';
        const simulatedLevel = Math.min(0.3 + (transcript.length * 0.05), 0.9);
        callbacks.onAudioLevel(simulatedLevel);
      }

      // Finale Ergebnisse an Callback weiterleiten
      if (lastResult?.isFinal) {
        this.clearTimeout();
        const transcript = lastResult[0]?.transcript?.trim() || '';
        if (transcript) {
          callbacks.onTranscript(transcript);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.clearTimeout();
      // 'aborted' ignorieren — wird bei manuellem Stop oder Timeout ausgeloest
      if (event.error === 'aborted') return;

      const message = ERROR_MESSAGES[event.error] || DEFAULT_ERROR;
      callbacks.onError(message);
      this.isListeningActive = false;
      callbacks.onStateChange('idle');
    };

    recognition.onend = () => {
      this.clearTimeout();
      // Audio-Level auf 0 setzen wenn Erkennung endet
      callbacks.onAudioLevel(0);
      if (this.isListeningActive) {
        this.isListeningActive = false;
        callbacks.onStateChange('idle');
      }
    };

    try {
      recognition.start();
      callbacks.onStateChange('listening');
      // Timeout starten: Verhindert Endlos-Haengen auf iOS Safari (BUG-07)
      this.startTimeout(callbacks);
    } catch {
      callbacks.onError('Spracherkennung konnte nicht gestartet werden.');
      callbacks.onStateChange('idle');
      this.isListeningActive = false;
    }
  }

  /** Stoppt die laufende Spracherkennung */
  stopListening(): void {
    this.clearTimeout();
    this.isListeningActive = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignorieren — recognition war bereits gestoppt
      }
    }
  }

  /** Gibt alle Ressourcen frei */
  cleanup(): void {
    this.stopListening();
    this.recognition = null;
    this.callbacks = null;
  }

  /** Startet den Timeout-Timer (iOS Safari Freeze-Schutz, BUG-07) */
  private startTimeout(callbacks: SpeechEngineCallbacks): void {
    this.clearTimeout();
    this.timeoutId = setTimeout(() => {
      if (!this.isListeningActive) return;
      // Recognition abbrechen und Fehler melden
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch {
          // Ignorieren
        }
      }
      this.isListeningActive = false;
      callbacks.onAudioLevel(0);
      callbacks.onError('Keine Sprache erkannt. Bitte erneut versuchen oder stattdessen tippen.');
      callbacks.onStateChange('idle');
    }, RECOGNITION_TIMEOUT_MS);
  }

  /** Setzt den Timeout zurueck (z.B. bei Zwischenergebnissen) */
  private resetTimeout(callbacks: SpeechEngineCallbacks): void {
    this.startTimeout(callbacks);
  }

  /** Loescht den Timeout-Timer */
  private clearTimeout(): void {
    if (this.timeoutId) {
      globalThis.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /** Holt den SpeechRecognition-Konstruktor (mit webkit-Prefix-Fallback) */
  private getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
    if (typeof window === 'undefined') return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    return win.SpeechRecognition || win.webkitSpeechRecognition || null;
  }
}
