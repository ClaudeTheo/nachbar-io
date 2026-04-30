// components/senior/MicView.tsx
// Task H-2: Sprachaufnahme-View fuer den /schreiben/mic/:recipientId Screen.
//
// Zustaende:
//   1. ready      — Grosser roter Mikrofon-Button, "Tippen Sie zum Sprechen"
//   2. recording  — Button pulsiert, "Aufnahme laeuft..."
//   3. processing — Spinner, "Wird erkannt..."
//   4. transcript — Transkript anzeigen, Nochmal / Fertig Buttons
//
// Senior-UI Regeln (Phase-1 Design-Doc):
//   - Mic-Button: >=120px
//   - Action-Buttons: >=56px
//   - Back-Link: >=44px
//   - Anthrazit-Farben, rounded-2xl, focus:ring-4

"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MicState = "ready" | "recording" | "processing" | "transcript";

export interface MicViewProps {
  recipientName: string;
  recipientIndex: number;
  recipientPhone: string;
  /** Test-only: Aufnahme ueberspringen, Transkript direkt anzeigen */
  _testTranscript?: string;
}

export function MicView({
  recipientName,
  recipientIndex,
  recipientPhone: _recipientPhone,
  _testTranscript,
}: MicViewProps) {
  const router = useRouter();
  const [state, setState] = useState<MicState>(
    _testTranscript ? "transcript" : "ready",
  );
  const [transcript, setTranscript] = useState(_testTranscript ?? "");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Aufnahme starten
  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stream-Tracks sofort freigeben
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setState("processing");

        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");

          const res = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }

          const data = await res.json();
          setTranscript(data.text);
          setState("transcript");
        } catch {
          setError(
            "Die Spracherkennung ist gerade nicht verfuegbar. Bitte versuchen Sie es spaeter.",
          );
          setState("ready");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      setError("Bitte erlauben Sie den Zugriff auf das Mikrofon.");
    }
  }, []);

  // Aufnahme stoppen
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Mic-Button Handler
  const handleMicClick = useCallback(() => {
    if (state === "ready") {
      startRecording();
    } else if (state === "recording") {
      stopRecording();
    }
  }, [state, startRecording, stopRecording]);

  // Nochmal: Zurueck zu ready
  const handleRetry = useCallback(() => {
    setTranscript("");
    setError(null);
    setState("ready");
  }, []);

  // Fertig: Transkript speichern und zur Review-Seite
  const handleDone = useCallback(() => {
    sessionStorage.setItem(
      `schreiben_transcript_${recipientIndex}`,
      transcript,
    );
    router.push(`/schreiben/review/${recipientIndex}`);
  }, [recipientIndex, transcript, router]);

  return (
    <section aria-label="Sprachaufnahme">
      {/* Zurueck-Link */}
      <Link
        href="/schreiben"
        className="inline-flex items-center text-base font-semibold text-anthrazit focus:outline-none focus:ring-4 focus:ring-quartier-green/40 rounded-xl px-3 py-2"
        style={{ minHeight: "44px" }}
      >
        &larr; Zurueck
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-anthrazit">
        Nachricht an {recipientName}
      </h1>

      {/* Fehleranzeige */}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-2xl border-2 border-red-400 bg-red-50 p-4 text-base text-red-800"
        >
          {error}
        </div>
      )}

      {/* Ready / Recording / Processing */}
      {(state === "ready" || state === "recording" || state === "processing") && (
        <div className="mt-8 flex flex-col items-center gap-6">
          {state === "processing" ? (
            <>
              {/* Spinner */}
              <div
                className="h-16 w-16 animate-spin rounded-full border-4 border-anthrazit/20 border-t-anthrazit"
                role="status"
                aria-label="Wird erkannt"
              />
              <p className="text-lg font-semibold text-anthrazit">
                Wird erkannt...
              </p>
            </>
          ) : (
            <>
              {/* Mic-Button */}
              <button
                type="button"
                onClick={handleMicClick}
                aria-label={
                  state === "ready"
                    ? "Aufnahme starten"
                    : "Aufnahme stoppen"
                }
                className={`flex items-center justify-center rounded-full text-white focus:outline-none focus:ring-4 focus:ring-quartier-green/40 transition-transform ${
                  state === "recording"
                    ? "bg-red-600 animate-pulse scale-105"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                style={{ minHeight: "120px", minWidth: "120px" }}
                data-testid="mic-button"
              >
                {/* Mikrofon-Icon (SVG) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-12 w-12"
                  aria-hidden="true"
                >
                  <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4Z" />
                  <path d="M6 11a1 1 0 1 0-2 0 8 8 0 0 0 7 7.93V21H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.07A8 8 0 0 0 20 11a1 1 0 1 0-2 0 6 6 0 0 1-12 0Z" />
                </svg>
              </button>
              <p className="text-lg font-semibold text-anthrazit text-center">
                {state === "ready"
                  ? "Tippen Sie zum Sprechen"
                  : "Aufnahme laeuft... Tippen Sie zum Stoppen"}
              </p>
            </>
          )}
        </div>
      )}

      {/* Transcript */}
      {state === "transcript" && (
        <div className="mt-8 flex flex-col gap-6">
          <div className="rounded-2xl border-2 border-anthrazit bg-white p-6">
            <p className="text-xl font-medium text-anthrazit leading-relaxed">
              {transcript}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleRetry}
              className="flex-1 rounded-2xl border-2 border-anthrazit bg-white px-6 py-3 text-base font-semibold text-anthrazit focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
              style={{ minHeight: "56px" }}
            >
              Nochmal
            </button>
            <button
              type="button"
              onClick={handleDone}
              className="flex-1 rounded-2xl border-2 border-quartier-green bg-quartier-green px-6 py-3 text-base font-semibold text-white focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
              style={{ minHeight: "56px" }}
            >
              Fertig
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
