"use client";

// Praevention — Wake-Word Listener
// Hoert auf "Hallo Nachbar" (Porcupine WASM) mit Fallback-Button.
// DSGVO: Audio wird komplett lokal verarbeitet, kein Server-Upload fuer Wake-Word.
// Custom Wake-Word "Hallo Nachbar" benoetigt Picovoice Console Training.

import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";

// Porcupine-Typen (dynamisch geladen)
type PorcupineWorker = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  release: () => Promise<void>;
};

interface WakeWordListenerProps {
  /** Callback wenn Wake-Word erkannt oder Button gedrueckt */
  onActivated: () => void;
  /** Voice-Consent erteilt? Ohne Consent nur Button-Modus */
  voiceConsentGiven: boolean;
  /** Deaktiviert (z.B. waehrend Sitzung laeuft) */
  disabled?: boolean;
}

export default function WakeWordListener({
  onActivated,
  voiceConsentGiven,
  disabled = false,
}: WakeWordListenerProps) {
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<PorcupineWorker | null>(null);

  // Porcupine initialisieren (nur wenn Voice-Consent gegeben)
  const startListening = useCallback(async () => {
    if (!voiceConsentGiven || isListening || disabled) return;

    const accessKey = process.env.NEXT_PUBLIC_PICOVOICE_ACCESS_KEY;
    if (!accessKey) {
      // Kein API-Key — nur Button-Modus
      console.warn(
        "[WakeWord] Kein PICOVOICE_ACCESS_KEY — nur Button-Modus verfuegbar",
      );
      setError("Sprachsteuerung nicht konfiguriert");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Dynamischer Import (WASM-Module, nur im Browser)
      const { PorcupineWorker: PorcWorker } =
        await import("@picovoice/porcupine-web");

      const porcupineWorker = await PorcWorker.create(
        accessKey,
        // Built-in Keyword als Platzhalter — spaeter durch Custom "Hallo Nachbar" ersetzen
        // Custom Keywords benoetigen Picovoice Console Training (.ppn Datei)
        { builtin: "Computer", sensitivity: 0.7 },
        (detection: { label: string }) => {
          console.log("[WakeWord] Erkannt:", detection.label);
          onActivated();
        },
      );

      await porcupineWorker.start();
      workerRef.current = porcupineWorker;
      setIsListening(true);
    } catch (err) {
      console.error("[WakeWord] Fehler beim Starten:", err);
      setError("Mikrofon-Zugriff fehlgeschlagen");
    } finally {
      setIsLoading(false);
    }
  }, [voiceConsentGiven, isListening, disabled, onActivated]);

  // Stoppen
  const stopListening = useCallback(async () => {
    if (workerRef.current) {
      try {
        await workerRef.current.stop();
        await workerRef.current.release();
      } catch {
        // Ignorieren bei Cleanup
      }
      workerRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.stop().catch(() => {});
        workerRef.current.release().catch(() => {});
      }
    };
  }, []);

  // Fallback-Button Handler
  const handleButtonClick = () => {
    if (disabled) return;
    onActivated();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Haupt-Button: Immer sichtbar als Fallback */}
      <button
        onClick={handleButtonClick}
        disabled={disabled}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-all hover:bg-emerald-700 active:scale-95 disabled:bg-gray-300 disabled:shadow-none"
        aria-label="Sitzung starten"
      >
        <Mic className="h-8 w-8" />
      </button>

      <p className="text-sm text-gray-600">
        {disabled ? "Sitzung laeuft..." : "Tippen Sie zum Starten"}
      </p>

      {/* Voice-Modus: Porcupine Wake-Word */}
      {voiceConsentGiven && !disabled && (
        <div className="flex items-center gap-2">
          {isListening ? (
            <button
              onClick={stopListening}
              className="flex items-center gap-1.5 rounded-full bg-red-100 px-4 py-2 text-sm text-red-700 transition-colors hover:bg-red-200"
            >
              <MicOff className="h-4 w-4" />
              Sprachsteuerung aus
            </button>
          ) : (
            <button
              onClick={startListening}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-4 py-2 text-sm text-emerald-700 transition-colors hover:bg-emerald-200"
            >
              <Mic className="h-4 w-4" />
              {isLoading ? "Wird geladen..." : '"Hallo Nachbar" aktivieren'}
            </button>
          )}
        </div>
      )}

      {/* Fehler-Anzeige */}
      {error && <p className="text-xs text-amber-600">{error}</p>}
    </div>
  );
}
