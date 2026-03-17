"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// --- Typen fuer die Device-API-Antwort ---

export interface WeatherDay {
  day: string;       // Deutscher Kurzname: "Mo", "Di", ...
  tempMax: number;   // Tageshöchsttemperatur in °C
  icon: string;      // Icon-Schluessel (sun/cloud/rain/snow/fog/storm)
}

export interface WeatherInfo {
  temp: number | null;
  icon: string;
  forecast: WeatherDay[];
}

export interface AlertInfo {
  id: string;
  category: string;
  title: string;
  body: string;
  isEmergency: boolean;
  createdAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  category: string;
  categoryLabel: string;
  relevance: number;
  publishedAt: string;
}

export interface TerminalStatusData {
  weather: WeatherInfo;
  alerts: AlertInfo[];
  lastCheckin: string | null;
  nextAppointment: string | null;
  unreadCount: number;
  news: NewsItem[];
  newsCount: number;
  userName: string;
  greeting: string;
}

interface UseTerminalDataReturn {
  data: TerminalStatusData | null;
  loading: boolean;
  error: string | null;
  sendCheckin: () => Promise<void>;
  ackAlert: (alertId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

// Polling-Intervall: 2 Minuten
const POLL_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Custom Hook: Laedt Terminal-Daten von der Device-API und pollt alle 2 Minuten.
 * Bietet Funktionen fuer Check-in und Alert-Bestaetigung.
 */
export function useTerminalData(token: string): UseTerminalDataReturn {
  const [data, setData] = useState<TerminalStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Status-Daten laden
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/device/status?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      const json: TerminalStatusData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verbindungsfehler";
      setError(message);
      console.error("[useTerminalData] Fehler beim Laden:", message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Check-in senden
  const sendCheckin = useCallback(async () => {
    try {
      const res = await fetch("/api/device/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      // Nach erfolgreichem Check-in Daten aktualisieren
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Check-in fehlgeschlagen";
      console.error("[useTerminalData] Check-in Fehler:", message);
      throw err;
    }
  }, [token, refresh]);

  // Alert bestaetigen
  const ackAlert = useCallback(async (alertId: string) => {
    try {
      const res = await fetch("/api/device/alert-ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, token }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      // Nach Bestaetigung Daten aktualisieren
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bestaetigung fehlgeschlagen";
      console.error("[useTerminalData] Alert-Ack Fehler:", message);
      throw err;
    }
  }, [token, refresh]);

  // Initiales Laden + Polling
  useEffect(() => {
    refresh();

    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refresh]);

  return { data, loading, error, sendCheckin, ackAlert, refresh };
}
