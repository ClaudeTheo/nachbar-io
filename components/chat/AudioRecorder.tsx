"use client";

// Einfacher Audio-Recorder fuer Sprachnachrichten via MediaRecorder API.
// Max 60 Sekunden (Hard-Stop bei Limit).

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, X } from "lucide-react";

interface AudioRecorderProps {
  onComplete: (blob: Blob, durationSec: number, mimeType: string) => void;
  onCancel: () => void;
  maxSeconds?: number;
}

export function AudioRecorder({
  onComplete,
  onCancel,
  maxSeconds = 60,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTsRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);

  const stopRecorder = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopRecorder();
    };
  }, [stopRecorder]);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const duration = Math.max(
          1,
          Math.round((Date.now() - startTsRef.current) / 1000),
        );
        onComplete(blob, Math.min(duration, maxSeconds), "audio/webm");
      };
      recorder.start();
      recorderRef.current = recorder;
      startTsRef.current = Date.now();
      setIsRecording(true);

      intervalRef.current = window.setInterval(() => {
        const sec = Math.round((Date.now() - startTsRef.current) / 1000);
        setElapsedSec(sec);
        if (sec >= maxSeconds) {
          stopRecorder();
        }
      }, 200);
    } catch {
      setError("Mikrofon-Zugriff verweigert");
    }
  }

  function stopAndSend() {
    stopRecorder();
  }

  function cancel() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      // Stop ohne onComplete — wir entfernen den Handler
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onCancel();
  }

  const remainingSec = Math.max(0, maxSeconds - elapsedSec);

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-300 bg-red-50 p-4">
        <span className="text-sm text-red-900">{error}</span>
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto text-sm font-medium text-red-900 underline"
        >
          Schliessen
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#2D3142] bg-white p-3">
      {!isRecording ? (
        <>
          <button
            type="button"
            onClick={startRecording}
            className="flex h-20 min-w-20 items-center justify-center gap-2 rounded-2xl bg-[#4CAF87] px-4 text-base font-semibold text-white"
            aria-label="Aufnahme starten"
          >
            <Mic className="h-6 w-6" />
            Aufnehmen
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-20 min-w-20 items-center justify-center gap-2 rounded-2xl border border-[#2D3142] px-4 text-base font-semibold text-[#2D3142]"
            aria-label="Abbrechen"
          >
            <X className="h-6 w-6" />
            Abbrechen
          </button>
        </>
      ) : (
        <>
          <div className="flex flex-1 items-center gap-3">
            <span className="flex h-3 w-3 animate-pulse rounded-full bg-red-500" />
            <span className="tabular-nums text-lg font-semibold text-[#2D3142]">
              {formatSeconds(elapsedSec)} / {formatSeconds(maxSeconds)}
            </span>
            <span className="text-sm text-[#2D3142]/70">
              noch {remainingSec} Sek
            </span>
          </div>
          <button
            type="button"
            onClick={stopAndSend}
            className="flex h-20 min-w-20 items-center justify-center gap-2 rounded-2xl bg-[#4CAF87] px-4 text-base font-semibold text-white"
            aria-label="Aufnahme beenden und senden"
          >
            <Square className="h-5 w-5" />
            Senden
          </button>
          <button
            type="button"
            onClick={cancel}
            className="flex h-20 min-w-20 items-center justify-center gap-2 rounded-2xl border border-[#2D3142] px-4 text-base font-semibold text-[#2D3142]"
            aria-label="Aufnahme verwerfen"
          >
            <X className="h-6 w-6" />
            Verwerfen
          </button>
        </>
      )}
    </div>
  );
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
