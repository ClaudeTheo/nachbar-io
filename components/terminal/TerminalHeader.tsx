"use client";

import { useState, useEffect } from "react";
import { useTerminal } from "@/lib/terminal/TerminalContext";
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog,
} from "lucide-react";

// Wetter-Icons: Mapping von API-String auf Lucide-Komponente
const WEATHER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sun: Sun, cloud: Cloud, rain: CloudRain,
  snow: CloudSnow, storm: CloudLightning, fog: CloudFog,
};

// Begrüßung abhängig von Tageszeit
function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 10) return "Guten Morgen";
  if (hour >= 10 && hour < 14) return "Guten Tag";
  if (hour >= 14 && hour < 18) return "Guten Nachmittag";
  if (hour >= 18 && hour < 22) return "Guten Abend";
  return "Gute Nacht";
}

/**
 * Terminal-Header: Wetter + 3-Tage-Forecast + Begrüßung links,
 * Uhrzeit + Datum rechts. Anthrazit-Hintergrund.
 */
export default function TerminalHeader() {
  const { data } = useTerminal();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hour = time.getHours();
  const timeStr = time.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const dateStr = time.toLocaleDateString("de-DE", {
    weekday: "short", day: "numeric", month: "numeric",
  });

  const greeting = getGreeting(hour);
  const userName = data?.userName ?? "";
  const weatherIcon = data?.weather?.icon ?? "cloud";
  const WeatherIcon = WEATHER_ICONS[weatherIcon] ?? Cloud;
  const temp = data?.weather?.temp;
  const forecast = data?.weather?.forecast ?? [];

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-anthrazit text-white">
      {/* Links: Wetter + 3-Tage-Mini + Begrüßung */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <WeatherIcon className="h-10 w-10 text-alert-amber" />
          <span className="text-[28px] font-bold">
            {temp !== null && temp !== undefined ? `${temp}°C` : "--°C"}
          </span>
        </div>

        {forecast.length > 0 && (
          <div className="flex items-center gap-3 text-[18px] text-white/70">
            {forecast.map((day) => (
              <span key={day.day}>{day.day}{day.tempMax}°</span>
            ))}
          </div>
        )}

        <span className="text-[24px] font-medium text-white/90">
          {greeting}{userName ? `, ${userName}` : ""}
        </span>
      </div>

      {/* Rechts: Uhrzeit + Datum */}
      <div className="flex flex-col items-end">
        <span className="text-[32px] font-bold leading-tight">{timeStr}</span>
        <span className="text-[18px] text-white/70">{dateStr}</span>
      </div>
    </header>
  );
}
