// modules/voice/hooks/useTtsPlayback.ts
// Welle C C6 — Wiederverwendbarer TTS-Playback-Hook
//
// Extrahiert aus modules/voice/components/companion/TTSButton.tsx, damit der
// Onboarding-Wizard TTS auch ohne Knopfdruck (Auto-Play bei neuer
// Assistant-Antwort) ausloesen kann.
//
// API: { play(text), stop(), isLoading, isPlaying }
// Voice/Speed werden aus localStorage ("quartier-voice-prefs-synced") gelesen,
// Default ash / 0.95.

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { getIOSAudioManager } from "../services/ios-audio-manager";

interface VoicePrefs {
  voice: string;
  speed: number;
}

const DEFAULTS: VoicePrefs = { voice: "ash", speed: 0.95 };

function readVoicePrefs(): VoicePrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem("quartier-voice-prefs-synced");
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<VoicePrefs>;
    return {
      voice: parsed.voice || DEFAULTS.voice,
      speed: typeof parsed.speed === "number" ? parsed.speed : DEFAULTS.speed,
    };
  } catch {
    return DEFAULTS;
  }
}

export interface UseTtsPlaybackReturn {
  play: (text: string) => Promise<void>;
  stop: () => void;
  isLoading: boolean;
  isPlaying: boolean;
}

export function useTtsPlayback(): UseTtsPlaybackReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const stopInternal = useCallback(() => {
    // iOS-Manager
    try {
      getIOSAudioManager().stop();
    } catch {
      // ignore
    }
    // HTMLAudio
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {
        // ignore
      }
    }
    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {
        // ignore
      }
      objectUrlRef.current = null;
    }
    audioRef.current = null;
  }, []);

  const stop = useCallback(() => {
    stopInternal();
    setIsPlaying(false);
  }, [stopInternal]);

  const play = useCallback(
    async (text: string) => {
      const trimmed = text?.trim();
      if (!trimmed) return;

      // Vorherige Wiedergabe stoppen
      stopInternal();
      setIsPlaying(false);
      setIsLoading(true);

      try {
        const { voice, speed } = readVoicePrefs();
        const res = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed.slice(0, 1000), voice, speed }),
        });
        if (!res.ok) {
          throw new Error(`TTS-Fehler: ${res.status}`);
        }
        const blob = await res.blob();

        // 1. iOS Audio Manager bevorzugt
        const manager = getIOSAudioManager();
        if (manager.canPlay()) {
          setIsLoading(false);
          setIsPlaying(true);
          try {
            await manager.playBlob(blob);
          } finally {
            setIsPlaying(false);
          }
          return;
        }

        // 2. Fallback: HTMLAudioElement
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setIsPlaying(false);
          if (objectUrlRef.current === url) {
            try {
              URL.revokeObjectURL(url);
            } catch {
              // ignore
            }
            objectUrlRef.current = null;
          }
        };
        audio.onerror = () => {
          setIsPlaying(false);
          if (objectUrlRef.current === url) {
            try {
              URL.revokeObjectURL(url);
            } catch {
              // ignore
            }
            objectUrlRef.current = null;
          }
          toast.error("Wiedergabefehler.");
        };

        setIsLoading(false);
        setIsPlaying(true);
        await audio.play().catch(() => {
          setIsPlaying(false);
          throw new Error("playback_blocked");
        });
      } catch {
        setIsLoading(false);
        setIsPlaying(false);
        toast.error("Sprachausgabe nicht verfuegbar.");
      }
    },
    [stopInternal],
  );

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      stopInternal();
    };
  }, [stopInternal]);

  return { play, stop, isLoading, isPlaying };
}
