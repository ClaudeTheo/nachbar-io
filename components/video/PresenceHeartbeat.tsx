// PresenceHeartbeat — Sendet regelmaessig Online-Status an Supabase Realtime
// Wird im App-Layout eingebunden, damit der eigene Online-Status sichtbar ist.
'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 Sekunden

/**
 * PresenceHeartbeat — Unsichtbare Komponente die den eigenen
 * Online-Status via Supabase Realtime Presence Channel sendet.
 *
 * Andere Nutzer können via usePresence(userId) diesen Status abfragen.
 */
export function PresenceHeartbeat() {
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channelName = `presence:user:${user.id}`;
      channel = supabase.channel(channelName);

      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Initiales Presence-Signal senden
          await channel!.track({
            userId: user.id,
            online_at: new Date().toISOString(),
          });

          // Regelmaessig aktualisieren
          intervalId = setInterval(async () => {
            await channel?.track({
              userId: user.id,
              online_at: new Date().toISOString(),
            });
          }, HEARTBEAT_INTERVAL_MS);
        }
      });
    }

    init();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (channel) {
        const supabase = createClient();
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return null; // Unsichtbare Komponente
}
