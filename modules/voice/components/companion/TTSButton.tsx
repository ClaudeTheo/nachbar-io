// components/companion/TTSButton.tsx
// Vorlesen-Button — nutzt Stimm-Einstellungen aus dem Profil (Supabase)
// Session 59: iOS AudioManager, Profil-basierte Preferences

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Volume2, Loader2, Square, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getIOSAudioManager } from "../../services/ios-audio-manager";

interface TTSButtonProps {
  text: string;
}

// Pilot-Modus: TTS fuer alle Nutzer freigeschalten
const PILOT_MODE = process.env.NEXT_PUBLIC_PILOT_MODE === "true";

/**
 * Liest Stimm-Einstellungen aus localStorage (Sync vom Profil-Hook).
 * Falls noch nichts im localStorage: laedt direkt aus Supabase und cached.
 */
async function getVoiceSettings(): Promise<{ voice: string; speed: number }> {
  const defaults = { voice: "ash", speed: 0.95 };
  if (typeof window === "undefined") return defaults;

  try {
    // 1. Primaer: localStorage (vom useVoicePreferences Hook gesetzt)
    const stored = localStorage.getItem("quartier-voice-prefs-synced");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        voice: parsed.voice || defaults.voice,
        speed: typeof parsed.speed === "number" ? parsed.speed : defaults.speed,
      };
    }

    // 2. Fallback: Direkt aus Supabase laden (Initial-Sync)
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("users")
        .select("voice_preferences")
        .eq("id", user.id)
        .single();
      if (data?.voice_preferences) {
        const prefs = data.voice_preferences as Record<string, unknown>;
        const resolved = {
          voice: (prefs.voice === "ash" || prefs.voice === "onyx"
            ? "ash"
            : "nova") as string,
          speed: typeof prefs.speed === "number" ? prefs.speed : defaults.speed,
          formality: prefs.formality || "formal",
        };
        // In localStorage cachen fuer naechstes Mal
        localStorage.setItem(
          "quartier-voice-prefs-synced",
          JSON.stringify(resolved),
        );
        return { voice: resolved.voice, speed: resolved.speed };
      }
    }
  } catch {
    // Fallback bei Fehler
  }
  return defaults;
}

export function TTSButton({ text }: TTSButtonProps) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    if (playing) {
      // Stoppe sowohl HTMLAudio als auch iOS AudioManager
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const audioManager = getIOSAudioManager();
      audioManager.stop();
      setPlaying(false);
      return;
    }

    setLoading(true);
    try {
      // Stimm-Einstellungen aus Profil lesen (async: laedt ggf. aus Supabase)
      const { voice, speed } = await getVoiceSettings();

      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.slice(0, 1000),
          voice,
          speed,
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
  }, [text, playing]);

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
    <Button
      data-testid="tts-button"
      variant="outline"
      onClick={handlePlay}
      disabled={loading || !text}
      className="mt-2 w-full gap-2 rounded-xl border-[#4CAF87] text-[#4CAF87] font-medium text-base transition-all hover:bg-[#4CAF87]/10 active:scale-95"
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
  );
}
