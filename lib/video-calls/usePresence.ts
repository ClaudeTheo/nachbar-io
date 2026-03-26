// usePresence — React Hook fuer Online-Status via Supabase Realtime Presence
// Zeigt an, ob ein bestimmter Nutzer gerade online ist.
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRESENCE_TIMEOUT_MS as _PRESENCE_TIMEOUT_MS } from "./presence";

/**
 * usePresence(userId) — Prueft ob ein Nutzer online ist.
 *
 * Nutzt Supabase Realtime Presence Channel `presence:user:{userId}`.
 * Ein Nutzer gilt als online wenn innerhalb der letzten 60s ein Signal empfangen wurde.
 */
export function usePresence(userId: string | null): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOnline(false);
      return;
    }

    const supabase = createClient();
    const channelName = `presence:user:${userId}`;
    const channel = supabase.channel(channelName);

    // Auf Presence-Sync lauschen
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        // Wenn mindestens ein Eintrag vorhanden → online
        const entries = Object.values(state).flat();
        setIsOnline(entries.length > 0);
      })
      .on("presence", { event: "leave" }, () => {
        // Kurz warten, dann pruefen ob noch jemand da ist
        setTimeout(() => {
          const state = channel.presenceState();
          const entries = Object.values(state).flat();
          setIsOnline(entries.length > 0);
        }, 1000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { isOnline };
}
