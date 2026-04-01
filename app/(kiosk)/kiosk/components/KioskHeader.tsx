"use client";

import { useEffect, useState } from "react";

/** Uhr + Datum + Wetter-Widget für das Kiosk-Dashboard */
export default function KioskHeader() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [weather, setWeather] = useState<{
    temp: number;
    icon: string;
    label: string;
  } | null>(null);

  // Uhrzeit + Datum aktualisieren
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
      );
      setDate(
        now.toLocaleDateString("de-DE", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    }

    updateClock();
    const interval = setInterval(updateClock, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Wetter laden (mit Fallback)
  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch("/api/weather");
        if (!res.ok) throw new Error("Wetter nicht verfügbar");
        const data = await res.json();
        setWeather({
          temp: Math.round(data.temp ?? data.temperature ?? 0),
          icon: data.icon ?? "🌤",
          label: data.label ?? data.description ?? "Wetter",
        });
      } catch {
        // Fallback: kein Wetter anzeigen
        setWeather(null);
      }
    }

    fetchWeather();
  }, []);

  return (
    <header className="kiosk-header">
      <div>
        <div className="kiosk-clock">{time}</div>
        <div className="kiosk-date">{date}</div>
      </div>

      <div className="kiosk-weather">
        {weather ? (
          <>
            <span style={{ fontSize: 28, marginRight: 8 }}>{weather.icon}</span>
            <span className="kiosk-weather-temp">{weather.temp}°C</span>
            <div style={{ fontSize: 14, marginTop: 2 }}>{weather.label}</div>
          </>
        ) : (
          <span style={{ opacity: 0.5 }}>Wetter wird geladen...</span>
        )}
      </div>
    </header>
  );
}
