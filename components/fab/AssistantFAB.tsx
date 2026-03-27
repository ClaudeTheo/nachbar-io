"use client";

// components/fab/AssistantFAB.tsx
// Nachbar.io — Neuer KI-Assistent FAB (violett, 56px, scroll-hide, dezentes Pulsieren)
// Standalone-Komponente fuer zukuenftige Verwendung ausserhalb von VoiceAssistantFAB

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic } from "lucide-react";

interface AssistantFABProps {
  onClick: () => void;
  seniorMode?: boolean;
}

/**
 * Violetter Floating Action Button fuer den KI-Assistenten.
 * - 56px Standard, 64px im Senior-Modus
 * - Scroll-Hide: Verschwindet bei Scroll-Down, erscheint bei Scroll-Up
 * - Dezentes Pulsieren alle 30 Sekunden
 */
export function AssistantFAB({ onClick, seniorMode = false }: AssistantFABProps) {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Scroll-Verhalten: Verstecken bei Scroll-Down, Zeigen bei Scroll-Up
  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    if (currentY > lastScrollY.current + 10) {
      setVisible(false); // Scroll down
    } else if (currentY < lastScrollY.current - 10) {
      setVisible(true); // Scroll up
    }
    lastScrollY.current = currentY;
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const size = seniorMode ? 64 : 56;

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-24 right-4 z-40 flex items-center justify-center rounded-full bg-violet-500 text-white shadow-lg animate-fab-pulse ${
        visible ? "fab-visible" : "fab-hidden"
      }`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        touchAction: "manipulation",
      }}
      aria-label="KI-Assistent"
      data-testid="assistant-fab"
    >
      <Mic className={seniorMode ? "h-7 w-7" : "h-6 w-6"} />
    </button>
  );
}
