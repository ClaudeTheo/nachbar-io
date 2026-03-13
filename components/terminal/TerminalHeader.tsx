"use client";

import { useState, useEffect } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudFog } from "lucide-react";
import { useTerminal } from "@/lib/terminal/TerminalContext";

// Wetter-Icon basierend auf API-Icon-String
function WeatherIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case "sun":
      return <Sun className={className} />;
    case "rain":
      return <CloudRain className={className} />;
    case "snow":
      return <CloudSnow className={className} />;
    case "storm":
      return <CloudLightning className={className} />;
    case "fog":
      return <CloudFog className={className} />;
    case "cloud":
    default:
      return <Cloud className={className} />;
  }
}

/**
 * Terminal-Header: Wetter (live), Begruessung + Datum, Uhrzeit.
 * Wetterdaten kommen aus dem TerminalContext (Device-API).
 */
export default function TerminalHeader() {
  const { data } = useTerminal();
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

  // Wetterdaten aus API oder Fallback
  const weatherTemp = data?.weather.temp;
  const weatherIcon = data?.weather.icon ?? "cloud";
  const tempDisplay = weatherTemp !== null && weatherTemp !== undefined
    ? `${weatherTemp} °C`
    : "-- °C";

  // Begruessung mit Name
  const greetingText = data
    ? `${data.greeting}${data.userName ? `, ${data.userName}` : ""}`
    : "";

  return (
    <header className="flex items-center justify-between bg-anthrazit text-white px-6 py-3">
      {/* Wetter (live aus Device-API) */}
      <div className="flex items-center gap-3 min-w-[160px]">
        <WeatherIcon icon={weatherIcon} className="h-8 w-8 text-quartier-green-light" />
        <span className="text-2xl font-semibold">{tempDisplay}</span>
      </div>

      {/* Begruessung + Datum zentriert */}
      <div className="text-center">
        {greetingText && (
          <div className="text-lg font-semibold text-quartier-green-light">
            {greetingText}
          </div>
        )}
        <div className="text-xl font-medium text-warmwhite/90">
          {dateString}
        </div>
      </div>

      {/* Uhrzeit rechts */}
      <div className="text-3xl font-bold tabular-nums min-w-[140px] text-right">
        {timeString}
      </div>
    </header>
  );
}
