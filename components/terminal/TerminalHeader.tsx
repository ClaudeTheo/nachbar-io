"use client";

import { useState, useEffect } from "react";
import { Cloud } from "lucide-react";

/**
 * Terminal-Header: Wetter, Datum und Uhrzeit
 * Zeigt statisches Wetter (Platzhalter), deutsches Datum und Live-Uhr.
 */
export default function TerminalHeader() {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Deutsches Datum: z.B. "Donnerstag, 13. Maerz 2026"
  const dateString = now.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Uhrzeit: z.B. "14:35:07"
  const timeString = now.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header className="flex items-center justify-between bg-anthrazit text-white px-6 py-3">
      {/* Wetter (statischer Platzhalter — wird in Task 2 an API angebunden) */}
      <div className="flex items-center gap-3 min-w-[160px]">
        <Cloud className="h-8 w-8 text-quartier-green-light" />
        <span className="text-2xl font-semibold">14 °C</span>
      </div>

      {/* Datum zentriert */}
      <div className="text-xl font-medium text-warmwhite/90">
        {dateString}
      </div>

      {/* Uhrzeit rechts */}
      <div className="text-3xl font-bold tabular-nums min-w-[140px] text-right">
        {timeString}
      </div>
    </header>
  );
}
