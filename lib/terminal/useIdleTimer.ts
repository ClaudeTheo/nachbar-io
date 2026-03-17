"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 Minuten

/**
 * Hook der erkennt ob der Nutzer inaktiv ist.
 * Setzt nach IDLE_TIMEOUT_MS ohne Touch/Click/Key isIdle=true.
 * Jede Interaktion setzt den Timer zurück.
 */
export function useIdleTimer() {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer starten/zuruecksetzen (ohne setState, nur Timer-Management)
  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsIdle(true), IDLE_TIMEOUT_MS);
  }, []);

  // Bei Nutzer-Interaktion: Idle zuruecksetzen + Timer neu starten
  const resetTimer = useCallback(() => {
    setIsIdle(false);
    startTimer();
  }, [startTimer]);

  useEffect(() => {
    const events = ["touchstart", "mousedown", "keydown"] as const;
    const handler = () => resetTimer();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    // Timer beim Laden starten (kein setState, nur Timer)
    startTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer, startTimer]);

  const wake = useCallback(() => {
    setIsIdle(false);
    resetTimer();
  }, [resetTimer]);

  return { isIdle, wake };
}
