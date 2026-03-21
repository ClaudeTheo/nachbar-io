// lib/voice/web-speech-engine.ts
// Web Speech API Backend mit AudioContext fuer Audio-Level

import type { SpeechEngine, SpeechEngineCallbacks } from './speech-engine';

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

/** Erstellt eine SpeechRecognition-Instanz (mit webkit-Fallback) */
function createRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined' && typeof globalThis === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = (typeof window !== 'undefined' ? window : globalThis) as any;
  const Ctor = g.SpeechRecognition ?? g.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor() as SpeechRecognitionLike;
}

/**
 * Web Speech API Backend mit AudioContext fuer Echtzeit-Audio-Level.
 * Nutzt getUserMedia parallel zu SpeechRecognition fuer Waveform-Daten.
 */
export class WebSpeechEngine implements SpeechEngine {
  private recognition: SpeechRecognitionLike | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrame: number | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: SpeechEngineCallbacks | null = null;

  isAvailable(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (typeof window !== 'undefined' ? window : globalThis) as any;
    return !!(g.SpeechRecognition ?? g.webkitSpeechRecognition);
  }

  startListening(callbacks: SpeechEngineCallbacks): void {
    this.callbacks = callbacks;

    const recognition = createRecognition();
    if (!recognition) {
      callbacks.onError('SpeechRecognition nicht verfügbar');
      return;
    }

    this.recognition = recognition;
    recognition.lang = 'de-DE';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      callbacks.onStateChange('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      this.resetSilenceTimer();
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          const text = r[0].transcript.trim();
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          if (text) {
            callbacks.onTranscript(text);
          }
          return;
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorLike) => {
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      callbacks.onError(event.error);
    };

    recognition.onend = () => {
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      this.stopAudioAnalysis();
    };

    try {
      recognition.start();
      // Audio-Analyse parallel starten (fuer Waveform)
      this.startAudioAnalysis(callbacks);
      // Stille-Timer: 15 Sekunden
      this.resetSilenceTimer();
    } catch {
      callbacks.onError('SpeechRecognition konnte nicht gestartet werden');
    }
  }

  stopListening(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* ignorieren */ }
    }
    this.stopAudioAnalysis();
    this.callbacks?.onStateChange('idle');
  }

  cleanup(): void {
    this.stopListening();
    if (this.recognition) {
      try { this.recognition.abort(); } catch { /* ignorieren */ }
      this.recognition = null;
    }
    this.callbacks = null;
  }

  /** Audio-Level via getUserMedia + AnalyserNode (parallel zu SpeechRecognition) */
  private async startAudioAnalysis(callbacks: SpeechEngineCallbacks): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ACtor = (typeof window !== 'undefined' ? window : globalThis as any).AudioContext;
      if (!ACtor) return;

      this.audioContext = new ACtor();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        // Durchschnitt normalisieren auf 0-1
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length / 255;
        callbacks.onAudioLevel(average);

        this.animationFrame = requestAnimationFrame(updateLevel);
      };

      this.animationFrame = requestAnimationFrame(updateLevel);
    } catch {
      // getUserMedia fehlgeschlagen — Waveform bleibt leer, SpeechRecognition laeuft weiter
    }
  }

  /** Stoppt Audio-Analyse und gibt Ressourcen frei */
  private stopAudioAnalysis(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch { /* ignorieren */ }
      this.sourceNode = null;
    }
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch { /* ignorieren */ }
      this.analyser = null;
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch { /* ignorieren */ }
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  /** Stille-Timer: 15 Sekunden ohne Ergebnis → Aufnahme stoppen */
  private resetSilenceTimer(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      if (this.recognition) {
        try { this.recognition.stop(); } catch { /* ignorieren */ }
      }
    }, 15_000);
  }
}
