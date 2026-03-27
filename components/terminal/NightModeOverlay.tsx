"use client";

import { useState, useEffect, useCallback } from "react";
import { useTerminal } from "@/lib/terminal/TerminalContext";

/**
 * Nachtmodus-Overlay (22:00–07:00):
 * - Große digitale Uhr, zentriert, weisser Text auf dunklem Hintergrund
 * - Datum darunter
 * - Notruf-Button (rot, 112) am unteren Rand
 * - Antippen irgendwo blendet das Overlay für 5 Minuten aus
 */
export default function NightModeOverlay() {
  const { dismissNightMode } = useTerminal();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Uhrzeit jede Sekunde aktualisieren für flüssige Anzeige
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1_000);
    return () => clearInterval(interval);
  }, []);

  // Notruf-Anruf auslösen
  const handleEmergency = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    window.location.href = "tel:112";
  }, []);

  // Uhrzeit formatieren (HH:MM)
  const timeString = currentTime.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Datum formatieren (Wochentag, TT. Monat JJJJ)
  const dateString = currentTime.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#2D3142]/95 cursor-pointer select-none"
      onClick={dismissNightMode}
      role="button"
      tabIndex={0}
      aria-label="Bildschirm aktivieren — tippen Sie irgendwo"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          dismissNightMode();
        }
      }}
    >
      {/* Uhr und Datum, vertikal zentriert */}
      <div className="flex flex-col items-center gap-2 mb-auto mt-auto">
        <time
          className="text-white font-bold tracking-wider"
          style={{ fontSize: "clamp(80px, 15vw, 160px)" }}
          dateTime={currentTime.toISOString()}
        >
          {timeString}
        </time>
        <p
          className="text-white/70 font-medium"
          style={{ fontSize: "clamp(20px, 3vw, 32px)" }}
        >
          {dateString}
        </p>

        {/* Hinweis zum Aktivieren */}
        <p className="text-white/40 text-lg mt-8">
          Bildschirm aktivieren — tippen Sie irgendwo
        </p>
      </div>

      {/* Notruf-Button am unteren Rand */}
      <div className="mb-8 w-full flex justify-center">
        <button
          onClick={handleEmergency}
          onTouchEnd={(e) => {
            e.stopPropagation();
            window.location.href = "tel:112";
          }}
          className="min-h-[80px] min-w-[280px] px-10 py-5 bg-[#EF4444] active:bg-[#B91C1C] text-white font-bold text-2xl rounded-2xl shadow-lg transition-colors focus:outline-none focus:ring-4 focus:ring-red-300"
          aria-label="Notruf 112 anrufen"
        >
          NOTRUF 112
        </button>
      </div>
    </div>
  );
}
