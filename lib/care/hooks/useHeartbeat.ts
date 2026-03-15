// lib/care/hooks/useHeartbeat.ts
// Nachbar.io — Heartbeat-Hook: Sendet bei App-Oeffnung automatisch einen Heartbeat

'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

// Heartbeat maximal alle 60 Sekunden senden (Rate-Limit Client-seitig)
const HEARTBEAT_INTERVAL_MS = 60_000;

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('kiosk') || ua.includes('tauri')) return 'kiosk';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
  if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) return 'mobile';
  return 'desktop';
}

export function useHeartbeat() {
  const lastSent = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastSent.current < HEARTBEAT_INTERVAL_MS) return;

    const sendHeartbeat = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'app',
            device_type: getDeviceType(),
          }),
        });

        lastSent.current = Date.now();
      } catch {
        // Heartbeat-Fehler darf App nicht blockieren
      }
    };

    sendHeartbeat();
  }, []);
}
