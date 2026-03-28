"use client";

// components/voice-assistant/PushToTalkButton.tsx
// Nachbar.io — Push-to-Talk Button mit Waveform-Anzeige

import React from "react";
import { Mic } from "lucide-react";
import { AudioWaveform } from "../voice/AudioWaveform";
import type { SheetState } from "./types";

interface PushToTalkButtonProps {
  /** Aktueller Sheet-Zustand */
  sheetState: SheetState;
  /** Audio-Pegel fuer Waveform */
  audioLevel: number;
  /** Handler: Druecken startet Aufnahme */
  onPushStart: (e: React.MouseEvent | React.TouchEvent) => void;
  /** Handler: Loslassen stoppt Aufnahme */
  onPushEnd: (e: React.MouseEvent | React.TouchEvent) => void;
}

/** Push-to-Talk Button: Idle-State (grosser Kreis) und Recording-State (pulsierend + Waveform) */
export function PushToTalkButton({
  sheetState,
  audioLevel,
  onPushStart,
  onPushEnd,
}: PushToTalkButtonProps) {
  // IDLE: Grosser Mikrofon-Button
  if (sheetState === "idle") {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <button
          data-testid="push-to-talk-btn"
          onMouseDown={onPushStart}
          onMouseUp={onPushEnd}
          onMouseLeave={onPushEnd}
          onTouchStart={onPushStart}
          onTouchEnd={onPushEnd}
          className="flex items-center justify-center rounded-full bg-[#4CAF87] text-white shadow-lg select-none"
          style={{
            width: "120px",
            height: "120px",
            touchAction: "none",
          }}
          aria-label="Gedrückt halten zum Sprechen"
        >
          <Mic className="h-12 w-12" />
        </button>
        <p className="text-base text-[#2D3142] font-medium text-center">
          Halten Sie gedrückt zum Sprechen
        </p>
      </div>
    );
  }

  // RECORDING: Pulsierender Button + Waveform
  if (sheetState === "recording") {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="relative flex items-center justify-center">
          {/* Pulsierender Ring */}
          <div
            className="absolute rounded-full bg-[#4CAF87]/20 animate-pulse"
            style={{ width: "150px", height: "150px" }}
          />
          <button
            data-testid="push-to-talk-btn"
            onMouseUp={onPushEnd}
            onMouseLeave={onPushEnd}
            onTouchEnd={onPushEnd}
            className="relative flex items-center justify-center rounded-full bg-[#4CAF87] text-white shadow-lg select-none"
            style={{
              width: "130px",
              height: "130px",
              touchAction: "none",
            }}
            aria-label="Loslassen zum Senden"
          >
            <Mic className="h-14 w-14" />
          </button>
        </div>
        <p className="text-base text-[#4CAF87] font-medium text-center">
          Lassen Sie los zum Senden
        </p>
        <AudioWaveform audioLevel={audioLevel} isActive={true} />
      </div>
    );
  }

  return null;
}
