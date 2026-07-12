"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  RealtimeVoiceSession,
  type RealtimeVoiceState,
} from "@/lib/webrtc/realtime-voice";

interface DialogModeProps {
  onMessage?: (role: "user" | "assistant", content: string) => void;
  onMicError?: () => void;
}

type SessionMint = {
  clientSecret: string;
  model: string;
  maxSessionSeconds: number;
};

export function DialogMode({ onMicError }: DialogModeProps = {}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sessionRef = useRef<RealtimeVoiceSession | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef(0);
  const [noticeConfirmed, setNoticeConfirmed] = useState(false);
  const [sessionState, setSessionState] = useState<RealtimeVoiceState>("idle");
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState(600);
  const [error, setError] = useState<string | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const stopSession = useCallback(() => {
    clearTimer();
    sessionRef.current?.end();
    sessionRef.current = null;
    setSessionState("idle");
    setUserSpeaking(false);
    setAssistantSpeaking(false);
    setMicEnabled(true);
    setNoticeConfirmed(false);
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
      sessionRef.current?.end();
    };
  }, [clearTimer]);

  const handleSessionError = useCallback(
    (message: string) => {
      clearTimer();
      sessionRef.current?.end();
      sessionRef.current = null;
      setSessionState("idle");
      setUserSpeaking(false);
      setAssistantSpeaking(false);
      setError(message);
      if (/Mikrofonzugriff/i.test(message)) onMicError?.();
    },
    [clearTimer, onMicError],
  );

  const startSession = useCallback(async () => {
    if (!noticeConfirmed || !audioRef.current) return;
    setError(null);
    setSessionState("connecting");
    setMicEnabled(true);

    let mint: SessionMint;
    try {
      const response = await fetch("/api/voice/realtime/session", {
        method: "POST",
      });
      if (response.status === 429) {
        throw new Error(
          "Das Stundenlimit ist erreicht. Bitte versuchen Sie es später erneut.",
        );
      }
      if (!response.ok) {
        throw new Error(
          "Die Sprach-KI ist gerade nicht verfügbar. Bitte nutzen Sie den Chat.",
        );
      }
      mint = (await response.json()) as SessionMint;
    } catch (cause) {
      setSessionState("idle");
      setError(
        cause instanceof Error
          ? cause.message
          : "Die Sprach-KI ist gerade nicht verfügbar.",
      );
      return;
    }

    const session = new RealtimeVoiceSession({
      onStateChange: setSessionState,
      onUserSpeakingChange: setUserSpeaking,
      onAssistantSpeakingChange: setAssistantSpeaking,
      onError: handleSessionError,
    });
    sessionRef.current = session;
    setRemainingSeconds(mint.maxSessionSeconds);
    deadlineRef.current = Date.now() + mint.maxSessionSeconds * 1000;
    timerRef.current = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1000),
      );
      setRemainingSeconds(remaining);
      if (remaining === 0) stopSession();
    }, 1000);

    await session.connect({
      clientSecret: mint.clientSecret,
      model: mint.model,
      audioElement: audioRef.current,
    });
  }, [handleSessionError, noticeConfirmed, stopSession]);

  const toggleMic = useCallback(() => {
    setMicEnabled((current) => {
      sessionRef.current?.setMicEnabled(!current);
      return !current;
    });
  }, []);

  const active = sessionState !== "idle" && sessionState !== "ended";
  const status = useMemo(() => {
    if (sessionState === "connecting") return "Verbindung wird hergestellt...";
    if (assistantSpeaking) return "Die KI spricht";
    if (userSpeaking) return "Ich höre Ihnen zu";
    if (!micEnabled) return "Mikrofon ist ausgeschaltet";
    return "Bereit - sprechen Sie in Ruhe";
  }, [assistantSpeaking, micEnabled, sessionState, userSpeaking]);

  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col gap-5 p-4">
      <audio ref={audioRef} hidden />

      <div
        className="rounded-lg border-2 border-[#EF4444] bg-white p-4 text-center text-base font-bold text-[#2D3142]"
        role="note"
      >
        Im Notfall: 112. Polizei: 110.
      </div>

      {error ? (
        <p className="rounded-lg border border-[#F59E0B] bg-[#FFF7E6] p-4 text-base text-[#2D3142]" role="alert">
          {error}
        </p>
      ) : null}

      {!active ? (
        <div className="flex flex-col gap-5">
          <div className="rounded-lg border border-[#2D3142]/20 bg-white p-4 text-base leading-7 text-[#2D3142]">
            <p>
              Ihre Stimme wird zur Verarbeitung an OpenAI übertragen. Sie wird
              von Nachbar.io nicht gespeichert; auch Transkripte werden nicht
              gespeichert.
            </p>
            <label className="mt-4 flex min-h-12 cursor-pointer items-center gap-3 font-medium">
              <input
                type="checkbox"
                checked={noticeConfirmed}
                onChange={(event) => setNoticeConfirmed(event.target.checked)}
                className="h-7 w-7 accent-[#4CAF87]"
              />
              Ich habe den Hinweis verstanden
            </label>
          </div>

          <Button
            onClick={() => void startSession()}
            disabled={!noticeConfirmed}
            className="min-h-[80px] w-full rounded-lg bg-[#4CAF87] text-lg font-semibold text-white hover:bg-[#3D9975]"
            aria-label="Gespräch starten"
          >
            <Mic className="mr-3 h-6 w-6" aria-hidden="true" />
            Gespräch starten
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-5">
          <div className="flex min-h-40 w-full flex-col items-center justify-center gap-3 rounded-lg border border-[#2D3142]/20 bg-white p-6">
            <Mic className="h-10 w-10 text-[#4CAF87]" aria-hidden="true" />
            <p className="text-center text-xl font-semibold text-[#2D3142]" aria-live="polite">
              {status}
            </p>
            <p className="text-base tabular-nums text-[#2D3142]/70">
              {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
            </p>
          </div>

          <Button
            onClick={toggleMic}
            variant="outline"
            className="min-h-12 w-full rounded-lg text-base"
            aria-pressed={!micEnabled}
          >
            {micEnabled ? <Mic className="mr-2" /> : <MicOff className="mr-2" />}
            {micEnabled ? "Mikrofon ausschalten" : "Mikrofon einschalten"}
          </Button>

          <Button
            onClick={stopSession}
            className="min-h-[80px] w-full rounded-lg bg-[#2D3142] text-lg font-semibold text-white hover:bg-[#202331]"
            aria-label="Gespräch beenden"
          >
            <Square className="mr-3 h-5 w-5" aria-hidden="true" />
            Gespräch beenden
          </Button>
        </div>
      )}
    </div>
  );
}
