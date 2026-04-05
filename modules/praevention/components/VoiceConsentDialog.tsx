"use client";

// Praevention — Voice-Consent Dialog
// DSGVO: Einwilligung zur Sprachverarbeitung (Whisper STT + TTS)
// Audio fuer Wake-Word (Porcupine) bleibt lokal — nur STT/TTS benoetigt Consent

import { useState } from "react";
import { Mic, MicOff, X } from "lucide-react";

interface VoiceConsentDialogProps {
  /** Dialog sichtbar? */
  open: boolean;
  /** Callback: true = Einwilligung erteilt, false = abgelehnt */
  onDecision: (consented: boolean) => void;
}

export default function VoiceConsentDialog({
  open,
  onDecision,
}: VoiceConsentDialogProps) {
  const [processing, setProcessing] = useState(false);

  if (!open) return null;

  const handleConsent = async (consent: boolean) => {
    setProcessing(true);
    onDecision(consent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <Mic className="h-5 w-5 text-emerald-700" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">
              Sprachsteuerung
            </h2>
          </div>
          <button
            onClick={() => onDecision(false)}
            className="rounded-lg p-2 hover:bg-gray-100"
            aria-label="Schließen"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Erklaerung */}
        <div className="mb-6 space-y-3 text-sm text-gray-600">
          <p>
            Wenn Sie die Sprachsteuerung aktivieren, wird Ihre Sprache zur
            Verarbeitung an einen Server gesendet (OpenAI Whisper).
          </p>
          <p>Die Antworten werden Ihnen vorgelesen (Text-to-Speech).</p>
          <div className="rounded-lg bg-emerald-50 p-3">
            <p className="font-medium text-emerald-800">
              Was passiert mit Ihren Daten?
            </p>
            <ul className="mt-1 list-inside list-disc text-emerald-700">
              <li>Audio wird nur zur Erkennung verarbeitet</li>
              <li>Keine dauerhafte Speicherung von Audiodaten</li>
              <li>Sie können jederzeit zum Text-Modus wechseln</li>
            </ul>
          </div>
          <p className="text-xs text-gray-500">
            Ohne Sprachsteuerung können Sie die Übungen per Text-Eingabe nutzen.
            Der volle Funktionsumfang bleibt erhalten.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => handleConsent(false)}
            disabled={processing}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
          >
            <MicOff className="h-5 w-5" />
            Nur Text
          </button>
          <button
            onClick={() => handleConsent(true)}
            disabled={processing}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white transition-all hover:bg-emerald-700 active:scale-95"
          >
            <Mic className="h-5 w-5" />
            Sprache erlauben
          </button>
        </div>
      </div>
    </div>
  );
}
