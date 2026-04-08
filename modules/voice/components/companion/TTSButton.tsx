// components/companion/TTSButton.tsx
// Vorlesen-Button mit Stimm-Einstellungen (Geschlecht + Tempo)
// Session 59: iOS AudioManager + Voice Preferences

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Volume2, Loader2, Square, Lock, Gauge, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getIOSAudioManager } from "../../services/ios-audio-manager";
import {
  useVoicePreferences,
  SPEED_LABELS,
  GENDER_LABELS,
  type VoiceSpeed,
} from "../../hooks/useVoicePreferences";

interface TTSButtonProps {
  text: string;
}

// Pilot-Modus: TTS fuer alle Nutzer freigeschalten
const PILOT_MODE = process.env.NEXT_PUBLIC_PILOT_MODE === "true";

export function TTSButton({ text }: TTSButtonProps) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const {
    gender,
    speed,
    voiceId,
    speedValue,
    toggleGender,
    cycleSpeed,
  } = useVoicePreferences();

  const isTtsAvailable = PILOT_MODE || true;

  // Cleanup: Audio stoppen wenn Komponente unmountet
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        if (audioRef.current.src) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = useCallback(async () => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.slice(0, 1000),
          voice: voiceId,
          speed: speedValue,
        }),
      });

      if (!res.ok) {
        throw new Error(`TTS-Fehler: ${res.status}`);
      }

      const blob = await res.blob();

      // iOS Audio-Manager versuchen
      const audioManager = getIOSAudioManager();
      if (audioManager.canPlay()) {
        try {
          setPlaying(true);
          await audioManager.playBlob(blob);
          setPlaying(false);
          return;
        } catch {
          setPlaying(false);
        }
      }

      // Fallback: HTMLAudioElement
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setPlaying(false);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      };

      audio.onerror = () => {
        setPlaying(false);
        URL.revokeObjectURL(url);
        toast.error("Wiedergabefehler.");
      };

      await audio.play().catch(() => {
        toast.error(
          "Wiedergabe blockiert — bitte prüfen Sie den Lautstärke-/Stummschalter.",
        );
        URL.revokeObjectURL(url);
        throw new Error("play blocked");
      });
      setPlaying(true);
    } catch {
      toast.error("Sprachausgabe nicht verfügbar.");
    } finally {
      setLoading(false);
    }
  }, [text, playing, voiceId, speedValue]);

  if (!isTtsAvailable) {
    return (
      <Button
        data-testid="tts-button-locked"
        variant="ghost"
        size="sm"
        disabled
        className="mt-1 h-8 gap-1 text-xs text-muted-foreground opacity-60"
        aria-label="Vorlesen — nur mit QuartierApp Plus"
      >
        <Lock className="h-3.5 w-3.5" />
        Vorlesen — mit QuartierApp Plus
      </Button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Vorlesen-Button */}
      <Button
        data-testid="tts-button"
        variant="outline"
        onClick={handlePlay}
        disabled={loading || !text}
        className="w-full gap-2 rounded-xl border-[#4CAF87] text-[#4CAF87] font-medium text-base transition-all hover:bg-[#4CAF87]/10 active:scale-95"
        style={{ minHeight: "48px", touchAction: "manipulation" }}
        aria-label={playing ? "Stoppen" : "Vorlesen"}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : playing ? (
          <Square className="h-5 w-5" />
        ) : (
          <Volume2 className="h-5 w-5" />
        )}
        {playing ? "Stoppen" : "Vorlesen"}
      </Button>

      {/* Stimm-Einstellungen: Geschlecht + Tempo */}
      <div className="flex gap-2">
        <button
          onClick={toggleGender}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#2D3142] transition-all hover:bg-gray-50 active:scale-95"
          style={{ minHeight: "40px", touchAction: "manipulation" }}
          aria-label={`Stimme: ${GENDER_LABELS[gender]}`}
        >
          <User className="h-4 w-4" />
          {GENDER_LABELS[gender]}
        </button>
        <button
          onClick={cycleSpeed}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#2D3142] transition-all hover:bg-gray-50 active:scale-95"
          style={{ minHeight: "40px", touchAction: "manipulation" }}
          aria-label={`Tempo: ${SPEED_LABELS[speed as VoiceSpeed]}`}
        >
          <Gauge className="h-4 w-4" />
          {SPEED_LABELS[speed as VoiceSpeed]}
        </button>
      </div>
    </div>
  );
}
