"use client";

import { useEffect } from "react";

export type Phase = "morgen" | "mittag" | "nachmittag" | "abend" | "nacht";

// Phase-Grenzen aus Handover 2026-05-11 (Iteration 5, claude.design v5+ Spec).
export function getPhase(hour: number): Phase {
  if (hour >= 6 && hour < 11) return "morgen";
  if (hour >= 11 && hour < 15) return "mittag";
  if (hour >= 15 && hour < 19) return "nachmittag";
  if (hour >= 19 && hour < 23) return "abend";
  return "nacht";
}

// Setzt data-phase auf <html> entsprechend der aktuellen Stunde.
// Wird im RootLayout gemountet. Prueft 1x pro Minute (Stundenwechsel zuverlaessig erfasst).
// CSS-Hook: globals.css [data-phase="..."] Selektoren setzen --phase-tint-bg.
export function PhaseDetector() {
  useEffect(() => {
    const apply = () => {
      const phase = getPhase(new Date().getHours());
      document.documentElement.dataset.phase = phase;
    };
    apply();
    const id = setInterval(apply, 60_000);
    return () => clearInterval(id);
  }, []);

  return null;
}
