// lib/care/hooks/useHeartbeat.ts
// Nachbar.io — Heartbeat-Hook: Sendet bei App-Oeffnung automatisch einen Heartbeat

"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { offlineQueue } from "@/lib/offline-queue";

// Heartbeat maximal alle 60 Sekunden senden (Rate-Limit Client-seitig)
const HEARTBEAT_INTERVAL_MS = 60_000;

// BUG-10 Fix: Globaler Zeitstempel statt useRef — bleibt bei Navigation erhalten
let lastSentGlobal = 0;

/** Nur fuer Tests: Globalen Zeitstempel zuruecksetzen */
export function _resetHeartbeatForTesting() {
  lastSentGlobal = 0;
}

function getDeviceType(): string {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("kiosk") || ua.includes("tauri")) return "kiosk";
  if (ua.includes("tablet") || ua.includes("ipad")) return "tablet";
  if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android"))
    return "mobile";
  return "desktop";
}

export function useHeartbeat() {
  useEffect(() => {
    // Always register online listener — flush queue when connectivity returns
    const handleOnline = () => {
      offlineQueue.flush().catch(() => {});
    };
    window.addEventListener("online", handleOnline);

    // Rate-limit check for heartbeat sending
    const now = Date.now();
    if (now - lastSentGlobal < HEARTBEAT_INTERVAL_MS) {
      return () => {
        window.removeEventListener("online", handleOnline);
      };
    }

    // Lock SOFORT setzen — verhindert Race bei parallelen Mounts (Codex-Review)
    lastSentGlobal = now;

    const sendHeartbeat = async () => {
      const bodyStr = JSON.stringify({
        source: "app",
        device_type: getDeviceType(),
      });

      try {
        const supabase = createClient();
        const { user } = await getCachedUser(supabase);
        if (!user) return;

        await fetch("/api/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: bodyStr,
        });
      } catch {
        // Heartbeat-Fehler darf App nicht blockieren
        offlineQueue.enqueue("/api/heartbeat", bodyStr).catch(() => {});
      }
    };

    sendHeartbeat();
    offlineQueue.flush().catch(() => {});

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);
}
