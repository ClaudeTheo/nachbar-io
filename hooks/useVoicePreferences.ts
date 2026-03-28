"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { VoicePreferences } from "@/modules/voice/components/companion/VoiceSettings";

// Default-Einstellungen fuer die Stimme
const VOICE_DEFAULTS: VoicePreferences = {
  voice: "nova",
  speed: 1.0,
  formality: "formal",
};

/**
 * Hook zum Laden und Speichern der Stimmen-Einstellungen.
 * Laedt voice_preferences aus der users-Tabelle,
 * speichert Aenderungen per Supabase Update.
 */
export function useVoicePreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] =
    useState<VoicePreferences>(VOICE_DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

  // Beim Mount: Preferences aus Supabase laden
  useEffect(() => {
    async function load() {
      if (!user) return;
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("users")
          .select("voice_preferences")
          .eq("id", user.id)
          .single();

        if (data?.voice_preferences) {
          const prefs = data.voice_preferences as Record<string, unknown>;
          setPreferences({
            voice: (prefs.voice === "onyx"
              ? "onyx"
              : "nova") as VoicePreferences["voice"],
            speed: typeof prefs.speed === "number" ? prefs.speed : 1.0,
            formality: (prefs.formality === "informal"
              ? "informal"
              : "formal") as VoicePreferences["formality"],
          });
        }
      } catch (err) {
        console.error("[useVoicePreferences] Laden fehlgeschlagen:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [user]);

  // Preferences in Supabase speichern
  const updatePreferences = useCallback(
    async (newPrefs: VoicePreferences) => {
      setPreferences(newPrefs);
      if (!user) return;

      try {
        const supabase = createClient();
        await supabase
          .from("users")
          .update({ voice_preferences: newPrefs })
          .eq("id", user.id);
      } catch (err) {
        console.error("[useVoicePreferences] Speichern fehlgeschlagen:", err);
      }
    },
    [user],
  );

  return { preferences, updatePreferences, isLoading };
}
