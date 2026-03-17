"use client";

import { useState, useEffect } from "react";
import { useTerminal } from "@/lib/terminal/TerminalContext";
import { useIdleTimer } from "@/lib/terminal/useIdleTimer";
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog,
} from "lucide-react";

const WEATHER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sun: Sun, cloud: Cloud, rain: CloudRain,
  snow: CloudSnow, storm: CloudLightning, fog: CloudFog,
};

const WEEKDAYS = [
  "Sonntag", "Montag", "Dienstag", "Mittwoch",
  "Donnerstag", "Freitag", "Samstag",
];
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

// Screensaver-Overlay: Zeigt Uhr, Datum und Wetter nach 5 Minuten Inaktivitaet
export default function ScreensaverOverlay() {
  const { isIdle, wake } = useIdleTimer();
  const { data } = useTerminal();
  const [time, setTime] = useState(new Date());

  // Uhr nur aktualisieren wenn Screensaver aktiv ist
  useEffect(() => {
    if (!isIdle) return;
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isIdle]);

  if (!isIdle) return null;

  const timeStr = time.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const dateStr = `${WEEKDAYS[time.getDay()]}, ${time.getDate()}. ${MONTHS[time.getMonth()]} ${time.getFullYear()}`;

  const weatherIcon = data?.weather?.icon ?? "cloud";
  const WeatherIcon = WEATHER_ICONS[weatherIcon] ?? Cloud;
  const temp = data?.weather?.temp;

  return (
    <div
      onClick={wake}
      onTouchStart={wake}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center cursor-pointer select-none"
      style={{
        background: "linear-gradient(135deg, #2D3142 0%, #3A8F6E 50%, #4CAF87 100%)",
      }}
    >
      {/* Uhrzeit */}
      <span className="text-[120px] font-bold text-white leading-none mb-4">
        {timeStr}
      </span>

      {/* Datum */}
      <span className="text-[32px] text-white/80 mb-8">
        {dateStr}
      </span>

      {/* Wetter-Leiste */}
      <div className="flex items-center gap-4 bg-white/10 rounded-2xl px-8 py-4">
        <WeatherIcon className="h-10 w-10 text-white/90" />
        <span className="text-[28px] font-semibold text-white">
          {temp !== null && temp !== undefined ? `${temp}°C` : "--°C"}
        </span>
        {data?.weather?.forecast?.map((day) => (
          <span key={day.day} className="text-[20px] text-white/60 ml-2">
            {day.day} {day.tempMax}°
          </span>
        ))}
      </div>

      {/* Hinweis */}
      <span className="absolute bottom-8 text-[20px] text-white/40">
        Berühren Sie den Bildschirm, um fortzufahren
      </span>
    </div>
  );
}
