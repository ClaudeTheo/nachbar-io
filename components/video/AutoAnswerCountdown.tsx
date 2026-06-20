"use client";

// Countdown-Overlay fuer die automatische Anruf-Annahme in der Senior-Shell
// (Welle AA-4). Muster aus components/terminal/video/KioskIncomingCall.tsx
// (Countdown via setInterval + Single-Fire-Ref). Sichtbarer Countdown +
// grosser „Ablehnen"-Button (>=80px). Greift nur bei beidseitigem Opt-in.

import { useState, useEffect, useRef } from "react";
import { PhoneOff } from "lucide-react";

interface AutoAnswerCountdownProps {
  callerName: string;
  seconds?: number;
  onAutoAnswer: () => void;
  onCancel: () => void;
}

const DEFAULT_SECONDS = 10;

export function AutoAnswerCountdown({
  callerName,
  seconds = DEFAULT_SECONDS,
  onAutoAnswer,
  onCancel,
}: AutoAnswerCountdownProps) {
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!firedRef.current) {
            firedRef.current = true;
            onAutoAnswer();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onAutoAnswer]);

  function handleCancel() {
    if (firedRef.current) return;
    firedRef.current = true;
    onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90"
      role="alertdialog"
      aria-label="Anruf wird automatisch angenommen"
    >
      <div className="mb-12 text-center">
        <h2 className="text-2xl font-semibold text-white">{callerName}</h2>
        <p
          className="mt-2 text-lg text-gray-300"
          data-testid="auto-answer-countdown-text"
        >
          Anruf wird in {remaining} Sekunden automatisch angenommen…
        </p>
      </div>

      <button
        type="button"
        onClick={handleCancel}
        className="flex min-h-[80px] items-center justify-center gap-3 rounded-full bg-red-600 px-10 text-xl font-semibold text-white shadow-lg transition-colors hover:bg-red-700"
        aria-label="Anruf ablehnen"
        data-testid="auto-answer-cancel"
      >
        <PhoneOff className="h-7 w-7" />
        Ablehnen
      </button>
    </div>
  );
}
