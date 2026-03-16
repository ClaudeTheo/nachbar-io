// components/video/IncomingCall.tsx
// Nachbar Plus — Eingehender Anruf Overlay mit Klingelton
// Senior-Modus: 80px Touch-Targets, hoher Kontrast

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';

interface IncomingCallProps {
  /** Name des Anrufers */
  callerName: string;
  /** Avatar-URL des Anrufers (optional) */
  callerAvatar?: string;
  /** Callback bei Annahme */
  onAccept: () => void;
  /** Callback bei Ablehnung */
  onDecline: () => void;
}

/** Auto-Timeout fuer verpasste Anrufe (30 Sekunden) */
const AUTO_TIMEOUT_MS = 30_000;

/**
 * Einfacher Klingelton via Web Audio API (Oszillator).
 * Erzeugt einen sanften Doppelton alle 2 Sekunden.
 */
function createRingtone(): { start: () => void; stop: () => void } {
  let audioContext: AudioContext | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const playTone = () => {
    if (!audioContext) return;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);

    // Sanfter Doppelton (440Hz + 520Hz nacheinander)
    osc.frequency.value = 440;
    gain.gain.value = 0.15;
    osc.start(audioContext.currentTime);
    osc.frequency.setValueAtTime(520, audioContext.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
    osc.stop(audioContext.currentTime + 0.5);
  };

  return {
    start: () => {
      try {
        audioContext = new AudioContext();
        playTone();
        intervalId = setInterval(playTone, 2000);
      } catch {
        // Web Audio nicht verfuegbar — stilles Klingeln
      }
    },
    stop: () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
      if (audioContext) {
        audioContext.close().catch(() => {});
        audioContext = null;
      }
    },
  };
}

/**
 * IncomingCall — Overlay fuer eingehende Anrufe.
 *
 * - Halbtransparenter schwarzer Hintergrund
 * - Anrufername + Avatar mit Puls-Animation
 * - Annehmen (gruen) + Ablehnen (rot), beide 80px
 * - 30s Auto-Timeout → verpasster Anruf
 * - Klingelton via Web Audio API
 */
export function IncomingCall({
  callerName,
  callerAvatar,
  onAccept,
  onDecline,
}: IncomingCallProps) {
  const ringtoneRef = useRef<ReturnType<typeof createRingtone> | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);

  // Klingelton starten und Auto-Timeout
  useEffect(() => {
    const ringtone = createRingtone();
    ringtoneRef.current = ringtone;
    ringtone.start();

    const timeout = setTimeout(() => {
      setIsTimedOut(true);
      ringtone.stop();
      onDecline();
    }, AUTO_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
      ringtone.stop();
    };
  }, [onDecline]);

  const handleAccept = useCallback(() => {
    ringtoneRef.current?.stop();
    onAccept();
  }, [onAccept]);

  const handleDecline = useCallback(() => {
    ringtoneRef.current?.stop();
    onDecline();
  }, [onDecline]);

  if (isTimedOut) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80"
      role="alertdialog"
      aria-label={`Eingehender Anruf von ${callerName}`}
      data-testid="incoming-call-overlay"
    >
      {/* Anrufer-Info */}
      <div className="mb-12 flex flex-col items-center gap-4">
        {/* Avatar mit Puls-Animation */}
        <div className="relative">
          {/* Puls-Ringe */}
          <div className="absolute inset-0 animate-ping rounded-full bg-[#4CAF87]/30" />
          <div
            className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#4CAF87]"
            data-testid="caller-avatar"
          >
            {callerAvatar ? (
              <img
                src={callerAvatar}
                alt={callerName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-white">
                {callerName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Name + Status */}
        <p className="text-2xl font-semibold text-white">{callerName}</p>
        <p className="text-lg text-white/70">Eingehender Video-Anruf</p>
      </div>

      {/* Aktions-Buttons */}
      <div className="flex items-center gap-8">
        {/* Ablehnen */}
        <button
          onClick={handleDecline}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 shadow-lg transition-colors hover:bg-red-700"
          aria-label="Anruf ablehnen"
          data-testid="decline-button"
        >
          <PhoneOff className="h-8 w-8 text-white" />
        </button>

        {/* Annehmen */}
        <button
          onClick={handleAccept}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-[#4CAF87] shadow-lg transition-colors hover:bg-[#3d9b73]"
          aria-label="Anruf annehmen"
          data-testid="accept-button"
        >
          <Phone className="h-8 w-8 text-white" />
        </button>
      </div>
    </div>
  );
}
