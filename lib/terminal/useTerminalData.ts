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
  // Welle 2: Fotos + Erinnerungen
  photosCount: number;
  remindersCount: number;
  stickiesCount: number;
  appointmentsToday: number;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asNonNegativeFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function asNullableDateString(value: unknown): string | null {
  return isValidDateString(value) ? value : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeWeatherForecast(value: unknown): WeatherDay[] {
  return asArray<unknown>(value).flatMap((valueDay) => {
    const day = isRecord(valueDay) ? valueDay : {};
    if (
      !isNonEmptyString(day.day) ||
      typeof day.tempMax !== "number" ||
      !Number.isFinite(day.tempMax) ||
      !isNonEmptyString(day.icon)
    ) {
      return [];
    }

    return [
      {
        day: day.day,
        tempMax: day.tempMax,
        icon: day.icon,
      },
    ];
  });
}

function normalizeAlerts(value: unknown): AlertInfo[] {
  return asArray<unknown>(value).flatMap((valueAlert) => {
    const alert = isRecord(valueAlert) ? valueAlert : {};
    if (
      !isNonEmptyString(alert.id) ||
      !isNonEmptyString(alert.category) ||
      !isNonEmptyString(alert.title) ||
      typeof alert.body !== "string" ||
      typeof alert.isEmergency !== "boolean" ||
      !isValidDateString(alert.createdAt)
    ) {
      return [];
    }

    return [
      {
        id: alert.id,
        category: alert.category,
        title: alert.title,
        body: alert.body,
        isEmergency: alert.isEmergency,
        createdAt: alert.createdAt,
      },
    ];
  });
}

function normalizeNews(value: unknown): NewsItem[] {
  return asArray<unknown>(value).flatMap((valueItem) => {
    const item = isRecord(valueItem) ? valueItem : {};
    if (
      !isNonEmptyString(item.id) ||
      !isNonEmptyString(item.title) ||
      !(typeof item.summary === "string" || item.summary === null) ||
      !isNonEmptyString(item.category) ||
      !isNonEmptyString(item.categoryLabel) ||
      typeof item.relevance !== "number" ||
      !Number.isFinite(item.relevance) ||
      !isValidDateString(item.publishedAt)
    ) {
      return [];
    }

    return [
      {
        id: item.id,
        title: item.title,
        summary: item.summary,
        category: item.category,
        categoryLabel: item.categoryLabel,
        relevance: item.relevance,
        publishedAt: item.publishedAt,
      },
    ];
  });
}

function normalizeWeather(value: unknown): WeatherInfo {
  const record = isRecord(value) ? value : {};
  const temp = record.temp;

  return {
    temp: typeof temp === "number" && Number.isFinite(temp) ? temp : null,
    icon: asString(record.icon, "cloud"),
    forecast: normalizeWeatherForecast(record.forecast),
  };
}

function normalizeTerminalStatusData(value: unknown): TerminalStatusData {
  const record = isRecord(value) ? value : {};

  return {
    weather: normalizeWeather(record.weather),
    alerts: normalizeAlerts(record.alerts),
    lastCheckin: asNullableDateString(record.lastCheckin),
    nextAppointment: asNullableDateString(record.nextAppointment),
    unreadCount: asNonNegativeFiniteNumber(record.unreadCount),
    news: normalizeNews(record.news),
    newsCount: asNonNegativeFiniteNumber(record.newsCount),
    userName: asString(record.userName),
    greeting: asString(record.greeting),
    photosCount: asNonNegativeFiniteNumber(record.photosCount),
    remindersCount: asNonNegativeFiniteNumber(record.remindersCount),
    stickiesCount: asNonNegativeFiniteNumber(record.stickiesCount),
    appointmentsToday: asNonNegativeFiniteNumber(record.appointmentsToday),
  };
}

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
      const json = await res.json();
      setData(normalizeTerminalStatusData(json));
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
