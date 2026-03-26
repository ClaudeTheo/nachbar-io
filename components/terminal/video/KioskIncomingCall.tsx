"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Phone, PhoneOff, X } from "lucide-react";

interface KioskIncomingCallProps {
  callerName: string;
  callerAvatar: string | null;
  autoAnswer: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onNotNow?: () => void;
}

const COUNTDOWN_SECONDS = 30;

export default function KioskIncomingCall({
  callerName,
  callerAvatar,
  autoAnswer,
  onAccept,
  onDecline,
  onNotNow,
}: KioskIncomingCallProps) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const resolvedRef = useRef(false);

  // Countdown-Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (!resolvedRef.current) {
            resolvedRef.current = true;
            // Countdown abgelaufen
            if (autoAnswer) {
              onAccept();
            } else {
              onDecline();
            }
          }
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoAnswer, onAccept, onDecline]);

  // Ringtone (Web Audio API) — nur bei normalem Klingeln
  useEffect(() => {
    if (autoAnswer) return;

    try {
      const ctx = new AudioContext();

      function playTone() {
        if (ctx.state === "closed") return;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.frequency.value = 440;
        osc2.frequency.value = 520;
        gain.gain.value = 0.15;
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.5);
        osc2.stop(ctx.currentTime + 0.5);
      }

      playTone();
      const ringtoneInterval = setInterval(playTone, 2000);
      return () => {
        clearInterval(ringtoneInterval);
        ctx.close();
      };
    } catch {
      // Audio nicht verfuegbar — still ignorieren
    }
  }, [autoAnswer]);

  const handleNotNow = useCallback(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onNotNow?.();
    onDecline();
  }, [onDecline, onNotNow]);

  return (
    <div
      role="alertdialog"
      aria-label={`Eingehender Anruf von ${callerName}`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#2D3142]/95"
    >
      {/* Avatar mit Puls-Animation */}
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-ping rounded-full bg-[#4CAF87]/30" />
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-white/20 text-5xl font-bold text-white">
          {callerAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={callerAvatar}
              alt={callerName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            callerName.charAt(0).toUpperCase()
          )}
        </div>
      </div>

      {/* Name + Status */}
      <h2 className="mb-2 text-3xl font-bold text-white">{callerName}</h2>
      {autoAnswer ? (
        <p className="mb-8 text-xl text-white/80">
          Wird in {countdown} Sekunden durchgestellt
        </p>
      ) : (
        <p className="mb-8 text-xl text-white/80">ruft an...</p>
      )}

      {/* Buttons */}
      <div className="flex gap-6">
        {autoAnswer ? (
          <>
            <button
              onClick={onAccept}
              aria-label="Sofort annehmen"
              className="flex min-h-[80px] min-w-[80px] flex-col items-center justify-center gap-2 rounded-2xl bg-[#4CAF87] px-6 text-white"
            >
              <Phone className="h-8 w-8" />
              <span className="text-sm font-semibold">Annehmen</span>
            </button>
            <button
              onClick={handleNotNow}
              aria-label="Nicht jetzt"
              className="flex min-h-[80px] min-w-[80px] flex-col items-center justify-center gap-2 rounded-2xl bg-white/20 px-6 text-white"
            >
              <X className="h-8 w-8" />
              <span className="text-sm font-semibold">Nicht jetzt</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onDecline}
              aria-label="Ablehnen"
              className="flex min-h-[80px] min-w-[80px] flex-col items-center justify-center gap-2 rounded-2xl bg-red-500 px-6 text-white"
            >
              <PhoneOff className="h-8 w-8" />
              <span className="text-sm font-semibold">Ablehnen</span>
            </button>
            <button
              onClick={onAccept}
              aria-label="Annehmen"
              className="flex min-h-[80px] min-w-[80px] flex-col items-center justify-center gap-2 rounded-2xl bg-[#4CAF87] px-6 text-white"
            >
              <Phone className="h-8 w-8" />
              <span className="text-sm font-semibold">Annehmen</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
