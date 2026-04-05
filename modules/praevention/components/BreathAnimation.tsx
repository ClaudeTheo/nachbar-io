"use client";

// Praevention — Atem-Animation
// SVG-Kreis mit CSS-Animation, 4-7-8 Rhythmus oder einfaches Beobachten

import { useState, useEffect, useRef } from "react";

interface BreathAnimationProps {
  /** Rhythmus: 4-7-8 oder einfach (gleichmaessig) */
  pattern?: "478" | "simple";
  /** Dauer in Sekunden (default: 180 = 3 Minuten) */
  durationSeconds?: number;
  /** Callback wenn Timer abgelaufen */
  onComplete?: () => void;
  /** Ob Animation laeuft */
  isActive?: boolean;
}

// 4-7-8 Muster: 4s einatmen, 7s halten, 8s ausatmen
const PHASES_478 = [
  { label: "Einatmen", seconds: 4, scale: 1.4 },
  { label: "Halten", seconds: 7, scale: 1.4 },
  { label: "Ausatmen", seconds: 8, scale: 1.0 },
];

// Einfaches Muster: 4s ein, 4s aus
const PHASES_SIMPLE = [
  { label: "Einatmen", seconds: 4, scale: 1.3 },
  { label: "Ausatmen", seconds: 4, scale: 1.0 },
];

export default function BreathAnimation({
  pattern = "simple",
  durationSeconds = 180,
  onComplete,
  isActive = true,
}: BreathAnimationProps) {
  const phases = pattern === "478" ? PHASES_478 : PHASES_SIMPLE;
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentPhase = phases[phaseIndex];

  useEffect(() => {
    if (!isActive) return;

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= durationSeconds) {
          clearInterval(intervalRef.current!);
          onComplete?.();
          return prev;
        }
        return next;
      });

      setPhaseElapsed((prev) => {
        const next = prev + 1;
        if (next >= phases[phaseIndex].seconds) {
          setPhaseIndex((pi) => (pi + 1) % phases.length);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, phaseIndex, phases, durationSeconds, onComplete]);

  const remaining = durationSeconds - elapsed;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  // Fortschritt innerhalb der Phase (0-1)
  const phaseProgress = phaseElapsed / currentPhase.seconds;

  // Kreis-Groesse basierend auf Phase
  const scale =
    currentPhase.label === "Einatmen"
      ? 1.0 + (currentPhase.scale - 1.0) * phaseProgress
      : currentPhase.label === "Ausatmen"
        ? currentPhase.scale + (1.0 - currentPhase.scale) * phaseProgress
        : currentPhase.scale;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Atem-Kreis */}
      <div className="relative flex h-48 w-48 items-center justify-center">
        <div
          className="absolute inset-0 rounded-full bg-emerald-200 opacity-40 transition-transform duration-1000 ease-in-out"
          style={{ transform: `scale(${scale})` }}
        />
        <div
          className="absolute inset-6 rounded-full bg-emerald-400 opacity-60 transition-transform duration-1000 ease-in-out"
          style={{ transform: `scale(${scale * 0.85})` }}
        />
        <div className="relative z-10 text-center">
          <p className="text-lg font-semibold text-emerald-900">
            {currentPhase.label}
          </p>
          {pattern === "478" && (
            <p className="text-sm text-emerald-700">
              {currentPhase.seconds - phaseElapsed}s
            </p>
          )}
        </div>
      </div>

      {/* Timer */}
      <p className="text-sm text-gray-500">
        {minutes}:{seconds.toString().padStart(2, "0")} verbleibend
      </p>
    </div>
  );
}
