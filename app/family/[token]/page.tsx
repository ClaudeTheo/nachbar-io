"use client";

import { use, useState, useEffect, useCallback } from "react";
import {
  Heart,
  Clock,
  TriangleAlert,
  CircleCheck,
  RefreshCw,
  Shield,
  Loader2,
} from "lucide-react";

/**
 * Familien-Dashboard: Zeigt den Status eines Seniors fuer Angehoerige.
 * Erreichbar unter /family/[token] — verwendet das selbe Device-Token-System.
 * Zeigt: Letztes Check-in, Stimmung, Alerts, Verbindungsstatus.
 */

interface FamilyStatusData {
  userName: string;
  lastCheckin: string | null;
  lastCheckinMood: string | null;
  isOnline: boolean;
  alertsToday: number;
  weather: { temp: number | null; icon: string };
}

export default function FamilyDashboard({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<FamilyStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/device/status?token=${encodeURIComponent(token)}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData({
        userName: json.userName || "Ihr Angehoeriger",
        lastCheckin: json.lastCheckin,
        lastCheckinMood: json.lastCheckinMood || null,
        isOnline: !!json.lastCheckin,
        alertsToday: json.alerts?.length ?? 0,
        weather: json.weather ?? { temp: null, icon: "cloud" },
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initialer Abruf + Polling alle 60 Sekunden
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Zeitdifferenz menschenlesbar (Deutsch)
  function timeAgo(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Gerade eben";
    if (minutes < 60) return `Vor ${minutes} Minuten`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Vor ${hours} ${hours === 1 ? "Stunde" : "Stunden"}`;
    const days = Math.floor(hours / 24);
    return `Vor ${days} ${days === 1 ? "Tag" : "Tagen"}`;
  }

  // Check-in-Status Farbe
  function checkinStatusColor(isoDate: string | null): string {
    if (!isoDate) return "text-anthrazit/40";
    const hoursAgo = (Date.now() - new Date(isoDate).getTime()) / 3600000;
    if (hoursAgo < 12) return "text-quartier-green";
    if (hoursAgo < 24) return "text-alert-amber";
    return "text-emergency-red";
  }

  // Ladezustand
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warmwhite">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-quartier-green" />
          <p className="text-lg text-anthrazit/70">Status wird geladen...</p>
        </div>
      </div>
    );
  }

  // Fehlerzustand
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warmwhite p-6">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <TriangleAlert className="h-12 w-12 text-alert-amber" />
          <h1 className="text-2xl font-bold text-anthrazit">
            Verbindungsfehler
          </h1>
          <p className="text-lg text-anthrazit/70">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchStatus();
            }}
            className="mt-4 rounded-xl bg-quartier-green px-6 py-3 text-white font-semibold active:scale-95"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  const statusColor = checkinStatusColor(data?.lastCheckin ?? null);

  return (
    <div className="min-h-screen bg-warmwhite">
      {/* Header */}
      <header className="bg-anthrazit px-6 py-4 text-white">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Familien-Dashboard</h1>
            <p className="text-sm text-warmwhite/70">
              {data?.userName ?? "Angehoerige(r)"}
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchStatus();
            }}
            aria-label="Aktualisieren"
            className="rounded-lg p-2 hover:bg-white/10 active:scale-95"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Inhalt */}
      <main className="mx-auto max-w-lg space-y-4 p-6">
        {/* Check-in Status (groesste Karte) */}
        <div className="rounded-2xl bg-white p-6 shadow-soft">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full ${
                data?.lastCheckin
                  ? "bg-quartier-green/10"
                  : "bg-anthrazit/5"
              }`}
            >
              <Heart className={`h-8 w-8 ${statusColor}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-anthrazit">
                Letztes Check-in
              </p>
              <p className={`text-xl font-semibold ${statusColor}`}>
                {data?.lastCheckin
                  ? timeAgo(data.lastCheckin)
                  : "Noch kein Check-in"}
              </p>
            </div>
          </div>
          {data?.lastCheckin && (
            <p className="mt-3 text-sm text-anthrazit/50">
              {new Date(data.lastCheckin).toLocaleString("de-DE", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        {/* Status-Karten Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Terminal Online-Status */}
          <div className="rounded-2xl bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              {data?.isOnline ? (
                <CircleCheck className="h-6 w-6 text-quartier-green" />
              ) : (
                <Clock className="h-6 w-6 text-anthrazit/30" />
              )}
              <div>
                <p className="text-sm font-medium text-anthrazit/60">
                  Terminal
                </p>
                <p className="text-base font-bold text-anthrazit">
                  {data?.isOnline ? "Aktiv" : "Inaktiv"}
                </p>
              </div>
            </div>
          </div>

          {/* Alerts heute */}
          <div className="rounded-2xl bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <Shield
                className={`h-6 w-6 ${
                  (data?.alertsToday ?? 0) > 0
                    ? "text-alert-amber"
                    : "text-quartier-green"
                }`}
              />
              <div>
                <p className="text-sm font-medium text-anthrazit/60">
                  Meldungen
                </p>
                <p className="text-base font-bold text-anthrazit">
                  {data?.alertsToday ?? 0} heute
                </p>
              </div>
            </div>
          </div>

          {/* Wetter */}
          <div className="rounded-2xl bg-white p-5 shadow-soft col-span-2">
            <div className="flex items-center gap-3">
              <div className="text-xl">
                {data?.weather.temp !== null && data?.weather.temp !== undefined
                  ? `${data.weather.temp} °C`
                  : "-- °C"}
              </div>
              <p className="text-sm text-anthrazit/60">
                Aktuelles Wetter am Standort
              </p>
            </div>
          </div>
        </div>

        {/* Hinweis */}
        <p className="text-center text-sm text-anthrazit/40 pt-4">
          Diese Seite aktualisiert sich automatisch alle 60 Sekunden.
          <br />
          Bei Sorgen kontaktieren Sie bitte direkt Ihren Angehoerigen.
        </p>
      </main>
    </div>
  );
}
