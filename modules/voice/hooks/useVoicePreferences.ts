// modules/voice/hooks/useVoicePreferences.ts
// Speichert Stimm-Einstellungen (Geschlecht + Tempo) im localStorage

import { useState, useCallback } from "react";

export type VoiceGender = "female" | "male";
export type VoiceSpeed = "slow" | "normal" | "fast";

export interface VoicePreferences {
  gender: VoiceGender;
  speed: VoiceSpeed;
}

/** OpenAI Voice-IDs pro Geschlecht */
export const VOICE_MAP: Record<VoiceGender, string> = {
  female: "nova", // warm, natuerlich, deutsch akzentfrei
  male: "ash", // warm, ruhig, deutsch akzentfrei
};

/** Speed-Werte fuer OpenAI TTS */
export const SPEED_MAP: Record<VoiceSpeed, number> = {
  slow: 0.85,
  normal: 1.0,
  fast: 1.15,
};

/** Labels fuer die UI */
export const SPEED_LABELS: Record<VoiceSpeed, string> = {
  slow: "Langsam",
  normal: "Normal",
  fast: "Schnell",
};

export const GENDER_LABELS: Record<VoiceGender, string> = {
  female: "Weiblich",
  male: "Männlich",
};

const STORAGE_KEY = "quartier-voice-prefs";

function loadPreferences(): VoicePreferences {
  if (typeof window === "undefined") return { gender: "female", speed: "normal" };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        gender: parsed.gender === "male" ? "male" : "female",
        speed: ["slow", "normal", "fast"].includes(parsed.speed) ? parsed.speed : "normal",
      };
    }
  } catch {
    // Fallback
  }
  return { gender: "female", speed: "normal" };
}

function savePreferences(prefs: VoicePreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage voll oder blockiert
  }
}

/**
 * Hook fuer Stimm-Einstellungen.
 * Speichert Geschlecht + Tempo im localStorage.
 */
export function useVoicePreferences() {
  const [prefs, setPrefs] = useState<VoicePreferences>(loadPreferences);

  const setGender = useCallback((gender: VoiceGender) => {
    setPrefs((prev) => {
      const next = { ...prev, gender };
      savePreferences(next);
      return next;
    });
  }, []);

  const setSpeed = useCallback((speed: VoiceSpeed) => {
    setPrefs((prev) => {
      const next = { ...prev, speed };
      savePreferences(next);
      return next;
    });
  }, []);

  const cycleSpeed = useCallback(() => {
    setPrefs((prev) => {
      const order: VoiceSpeed[] = ["slow", "normal", "fast"];
      const idx = order.indexOf(prev.speed);
      const next = { ...prev, speed: order[(idx + 1) % 3] };
      savePreferences(next);
      return next;
    });
  }, []);

  const toggleGender = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, gender: prev.gender === "female" ? "male" as const : "female" as const };
      savePreferences(next);
      return next;
    });
  }, []);

  return {
    ...prefs,
    voiceId: VOICE_MAP[prefs.gender],
    speedValue: SPEED_MAP[prefs.speed],
    speedLabel: SPEED_LABELS[prefs.speed],
    genderLabel: GENDER_LABELS[prefs.gender],
    setGender,
    setSpeed,
    cycleSpeed,
    toggleGender,
  };
}
