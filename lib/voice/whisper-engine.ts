// lib/voice/whisper-engine.ts
// MediaRecorder + Whisper API Backend — Fallback fuer iOS/Firefox

import type { SpeechEngine, SpeechEngineCallbacks } from './speech-engine';

/** Max Aufnahmedauer: 30 Sekunden */
const MAX_RECORDING_MS = 30_000;

/**
 * Whisper-basiertes Speech Backend.
 * Nutzt MediaRecorder fuer Audio-Aufnahme und sendet das Ergebnis
 * an /api/voice/transcribe (OpenAI Whisper Proxy).
 */
export class WhisperEngine implements SpeechEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private mediaStream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private animationFrame: number | null = null;
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: SpeechEngineCallbacks | null = null;

  isAvailable(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  startListening(callbacks: SpeechEngineCallbacks): void {
    this.callbacks = callbacks;
    this.chunks = [];
    this.startRecording(callbacks);
  }

  stopListening(): void {
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      // iOS-Fix: Timeout-Fallback falls onstop nicht feuert
      // callbacks lokal binden, um Race Condition bei erneutem startListening zu vermeiden
      const currentCallbacks = this.callbacks;
      const currentMimeType = this.mediaRecorder?.mimeType || 'audio/webm';
      const fallbackTimer = setTimeout(() => {
        this.stopAudioAnalysis();
        if (this.chunks.length > 0 && currentCallbacks) {
          const audioBlob = new Blob(this.chunks, { type: currentMimeType });
          this.chunks = [];
          this.transcribe(audioBlob, currentCallbacks);
        } else if (currentCallbacks) {
          currentCallbacks.onError('Aufnahme konnte nicht verarbeitet werden.');
          currentCallbacks.onStateChange('idle');
        }
      }, 2000);

      // Normaler Stop — onstop raeumt Timeout auf
      const originalOnStop = this.mediaRecorder.onstop;
      this.mediaRecorder.onstop = (ev: Event) => {
        clearTimeout(fallbackTimer);
        if (originalOnStop) originalOnStop.call(this.mediaRecorder!, ev);
      };

      this.mediaRecorder.stop();
    } else {
      this.stopAudioAnalysis();
    }
  }

  cleanup(): void {
    this.stopListening();
    this.stopAudioAnalysis();
    this.callbacks = null;
  }

  /** Startet getUserMedia + MediaRecorder + AudioContext */
  private async startRecording(callbacks: SpeechEngineCallbacks): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;

      // Audio-Analyse starten (fuer Waveform)
      this.startAudioAnalysis(stream, callbacks);

      // MediaRecorder starten — iOS unterstuetzt kein audio/webm, nur audio/mp4
      const mimeType = this.getBestMimeType();
      const recorderOptions: MediaRecorderOptions = {};
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }
      // Ohne mimeType waehlt der Browser automatisch das beste Format

      this.mediaRecorder = new MediaRecorder(stream, recorderOptions);

      this.mediaRecorder.ondataavailable = (event: { data: Blob }) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.stopAudioAnalysis();
        if (this.chunks.length === 0) {
          callbacks.onError('Keine Aufnahme empfangen. Bitte versuchen Sie es erneut.');
          callbacks.onStateChange('idle');
          return;
        }
        const blobType = this.mediaRecorder?.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(this.chunks, { type: blobType });
        this.chunks = [];
        this.transcribe(audioBlob, callbacks);
      };

      this.mediaRecorder.onerror = () => {
        this.stopAudioAnalysis();
        callbacks.onError('Aufnahme fehlgeschlagen');
        callbacks.onStateChange('idle');
      };

      this.mediaRecorder.start();
      callbacks.onStateChange('listening');

      // 30-Sekunden-Limit
      this.maxDurationTimer = setTimeout(() => {
        this.stopListening();
      }, MAX_RECORDING_MS);
    } catch (err) {
      const message = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Bitte Mikrofon freigeben in den Browser-Einstellungen.'
        : 'Mikrofon konnte nicht aktiviert werden.';
      callbacks.onError(message);
      callbacks.onStateChange('idle');
    }
  }

  /** Bestes verfuegbares Audio-Format ermitteln (iOS: mp4, Rest: webm) */
  private getBestMimeType(): string | null {
    if (typeof MediaRecorder === 'undefined') return null;
    // Bevorzugt: webm mit opus (Chrome/Edge/Firefox Desktop)
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
    // iOS-Fallback: mp4/aac (Safari, Chrome iOS, alle iOS-Browser)
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    if (MediaRecorder.isTypeSupported('audio/aac')) return 'audio/aac';
    // Letzter Fallback: Browser waehlt selbst
    return null;
  }

  /** Dateiendung aus MIME-Type ableiten */
  private getFileExtension(blobType: string): string {
    if (blobType.includes('mp4')) return 'mp4';
    if (blobType.includes('aac')) return 'aac';
    if (blobType.includes('ogg')) return 'ogg';
    return 'webm';
  }

  /** Sendet Audio-Blob an /api/voice/transcribe */
  private async transcribe(audioBlob: Blob, callbacks: SpeechEngineCallbacks): Promise<void> {
    callbacks.onStateChange('processing');

    try {
      const ext = this.getFileExtension(audioBlob.type);
      const formData = new FormData();
      formData.append('audio', audioBlob, `audio.${ext}`);

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        callbacks.onError('Spracherkennung nicht verfügbar, bitte tippen Sie Ihre Anfrage.');
        callbacks.onStateChange('idle');
        return;
      }

      const data = await res.json();
      const text = typeof data.text === 'string' ? data.text.trim() : '';

      if (text) {
        callbacks.onTranscript(text);
      } else {
        callbacks.onError('Kein Text erkannt. Bitte versuchen Sie es erneut.');
        callbacks.onStateChange('idle');
      }
    } catch {
      callbacks.onError('Spracherkennung nicht verfügbar, bitte tippen Sie Ihre Anfrage.');
      callbacks.onStateChange('idle');
    }
  }

  /** Audio-Level via AudioContext + AnalyserNode */
  private startAudioAnalysis(stream: MediaStream, callbacks: SpeechEngineCallbacks): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ACtor = (typeof window !== 'undefined' ? window : globalThis as any).AudioContext;
      if (!ACtor) return;

      const ctx = new ACtor() as AudioContext;
      this.audioContext = ctx;
      const analyser = ctx.createAnalyser();
      this.analyser = analyser;
      analyser.fftSize = 256;

      const source = ctx.createMediaStreamSource(stream);
      this.sourceNode = source;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

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
      // AudioContext fehlgeschlagen — Waveform bleibt leer
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
}
