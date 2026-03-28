"use client";

// components/voice-assistant/FABButton.tsx
// Nachbar.io — Floating Action Button fuer den KI-Sprach-Assistenten

import { Mic } from "lucide-react";

interface FABButtonProps {
  /** Klick-Handler zum Oeffnen des Sheets */
  onClick: () => void;
  /** Sichtbarkeit (scroll-hide Logik) */
  visible: boolean;
}

/** Violetter FAB-Button (56px, scroll-hide, dezentes Pulsieren) */
export function FABButton({ onClick, visible }: FABButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-24 right-4 z-40 flex items-center justify-center rounded-full shadow-lg bg-violet-500 text-white animate-fab-pulse transition-all hover:scale-110 active:scale-95 ${
        visible ? "fab-visible" : "fab-hidden"
      }`}
      style={{
        width: "56px",
        height: "56px",
        touchAction: "manipulation",
      }}
      aria-label="Sprachassistent"
      data-testid="voice-assistant-fab"
    >
      <Mic className="h-6 w-6" />
    </button>
  );
}
