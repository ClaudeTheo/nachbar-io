"use client";

import { useState, useEffect, useRef } from "react";
import { useTerminal } from "@/lib/terminal/TerminalContext";
import { useIdleTimer } from "@/lib/terminal/useIdleTimer";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
} from "lucide-react";

const WEATHER_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  sun: Sun,
  cloud: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
  fog: CloudFog,
};

const WEEKDAYS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];
const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

const SLIDE_INTERVAL_MS = 15 * 1000;

interface ScreensaverPhoto {
  id: string;
  url: string | null;
  caption: string | null;
}

interface StickyForScreensaver {
  id: string;
  title: string;
}

// Screensaver-Overlay: Foto-Diashow (oder Gradient-Fallback) nach 5 Min. Inaktivität
export default function ScreensaverOverlay() {
  const { isIdle, wake } = useIdleTimer();
  const { data, token } = useTerminal();
  const [time, setTime] = useState(new Date());
  const [photos, setPhotos] = useState<ScreensaverPhoto[]>([]);
  const [stickies, setStickies] = useState<StickyForScreensaver[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fotos + Stickies laden wenn Screensaver aktiv wird
  useEffect(() => {
    if (!isIdle) return;

    async function loadScreensaverData() {
      try {
        const [photosRes, remindersRes] = await Promise.all([
          fetch(`/api/device/photos?token=${encodeURIComponent(token)}`),
          fetch(`/api/device/reminders?token=${encodeURIComponent(token)}`),
        ]);
        if (photosRes.ok) {
          const pData = await photosRes.json();
          setPhotos(pData.photos ?? []);
        }
        if (remindersRes.ok) {
          const rData = await remindersRes.json();
          setStickies((rData.stickies ?? []).slice(0, 2));
        }
      } catch {
        // Fehler im Screensaver sind nicht kritisch
      }
    }
    loadScreensaverData().then(() => {
      setCurrentPhotoIndex(0);
      setFadeIn(true);
    });
  }, [isIdle, token]);

  // Uhr aktualisieren
  useEffect(() => {
    if (!isIdle) return;
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isIdle]);

  // Foto-Rotation alle 15 Sekunden mit Crossfade
  useEffect(() => {
    if (!isIdle || photos.length <= 1) return;

    slideTimerRef.current = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentPhotoIndex((i) => (i + 1) % photos.length);
        setFadeIn(true);
      }, 500);
    }, SLIDE_INTERVAL_MS);

    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    };
  }, [isIdle, photos.length]);

  if (!isIdle) return null;

  const timeStr = time.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = `${WEEKDAYS[time.getDay()]}, ${time.getDate()}. ${MONTHS[time.getMonth()]} ${time.getFullYear()}`;
  const weatherIcon = data?.weather?.icon ?? "cloud";
  const WeatherIcon = WEATHER_ICONS[weatherIcon] ?? Cloud;
  const temp = data?.weather?.temp;
  const hasPhotos = photos.length > 0 && photos[currentPhotoIndex]?.url;
  const currentPhoto = photos[currentPhotoIndex];

  return (
    <div
      onClick={wake}
      onTouchStart={wake}
      className="fixed inset-0 z-40 flex flex-col cursor-pointer select-none overflow-hidden"
      style={
        !hasPhotos
          ? {
              background:
                "linear-gradient(135deg, #2D3142 0%, #3A8F6E 50%, #4CAF87 100%)",
            }
          : { background: "#000" }
      }
    >
      {/* Foto-Hintergrund (Vollbild mit Crossfade) */}
      {hasPhotos && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentPhoto.url!}
          alt={currentPhoto.caption || ""}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${fadeIn ? "opacity-100" : "opacity-0"}`}
        />
      )}

      {/* Ohne Fotos: zentrierte Uhr (Gradient-Fallback) */}
      {!hasPhotos && (
        <div className="flex flex-col items-center justify-center flex-1">
          <span className="text-[120px] font-bold text-white leading-none mb-4">
            {timeStr}
          </span>
          <span className="text-[32px] text-white/80 mb-8">{dateStr}</span>
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
        </div>
      )}

      {/* Overlay-Leiste unten (immer sichtbar) */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm">
        {/* Sticky Notes (max 2) */}
        {stickies.length > 0 && (
          <div className="px-6 pt-3 flex gap-4">
            {stickies.map((s) => (
              <div
                key={s.id}
                className="flex-1 bg-alert-amber/90 rounded-xl px-4 py-2"
              >
                <p className="text-[20px] font-medium text-anthrazit truncate">
                  📌 {s.title}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Wetter + Datum + Uhr */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <WeatherIcon className="h-8 w-8 text-white/80" />
            <span className="text-[22px] text-white font-medium">
              {temp !== null && temp !== undefined ? `${temp}°C` : "--°C"}
            </span>
          </div>
          <span className="text-[22px] text-white/70">{dateStr}</span>
          <span className="text-[28px] font-bold text-white">{timeStr}</span>
        </div>
      </div>

      {/* Foto-Caption (oben) */}
      {hasPhotos && currentPhoto?.caption && (
        <div className="absolute top-6 left-0 right-0 flex justify-center">
          <span className="bg-black/50 backdrop-blur-sm rounded-xl px-6 py-2 text-[22px] text-white">
            {currentPhoto.caption}
          </span>
        </div>
      )}
    </div>
  );
}
