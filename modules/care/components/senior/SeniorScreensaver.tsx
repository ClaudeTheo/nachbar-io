"use client";

// Welle SB-3 — Foto-Karussell als Ruhezustand der Senior-Shell.
// Verwendet useIdleTimer (5 Min. Inaktivitaet) wieder und spiegelt die
// Slide-Rotation (15 s, Crossfade, Tap beendet) aus ScreensaverOverlay.
// Datenquelle: GET /api/senior/photos (Cookie-Auth, RLS-scoped via SB-1).
// Ohne Fotos bleibt der Bildschirm normal (kein leeres schwarzes Overlay).

import { useEffect, useRef, useState } from "react";
import { useIdleTimer } from "@/lib/terminal/useIdleTimer";

interface ScreensaverPhoto {
  id: string;
  url: string;
  caption: string | null;
}

const SLIDE_INTERVAL_MS = 15 * 1000;

function normalizePhotos(value: unknown): ScreensaverPhoto[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((photo) => {
    if (
      photo &&
      typeof photo === "object" &&
      typeof (photo as { id?: unknown }).id === "string" &&
      typeof (photo as { url?: unknown }).url === "string" &&
      (photo as { url: string }).url.length > 0
    ) {
      const p = photo as { id: string; url: string; caption?: unknown };
      return [
        {
          id: p.id,
          url: p.url,
          caption: typeof p.caption === "string" ? p.caption : null,
        },
      ];
    }
    return [];
  });
}

export function SeniorScreensaver() {
  const { isIdle, wake } = useIdleTimer();
  const [photos, setPhotos] = useState<ScreensaverPhoto[]>([]);
  const [index, setIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fotos laden, sobald der Screensaver aktiv wird.
  useEffect(() => {
    if (!isIdle) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/senior/photos", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setPhotos(normalizePhotos(data));
        setIndex(0);
        setFadeIn(true);
      } catch {
        // Screensaver-Fehler sind nicht kritisch.
      }
    })();
    return () => {
      active = false;
    };
  }, [isIdle]);

  // Foto-Rotation alle 15 Sekunden mit Crossfade.
  useEffect(() => {
    if (!isIdle || photos.length <= 1) return;
    slideTimerRef.current = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % photos.length);
        setFadeIn(true);
      }, 500);
    }, SLIDE_INTERVAL_MS);
    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    };
  }, [isIdle, photos.length]);

  if (!isIdle || photos.length === 0) return null;

  const current = photos[index];

  return (
    <div
      data-testid="senior-screensaver"
      onClick={wake}
      onTouchStart={wake}
      role="button"
      aria-label="Familienfotos — zum Beenden tippen"
      className="fixed inset-0 z-40 flex cursor-pointer select-none items-center justify-center overflow-hidden bg-black"
    >
      {/* Signed-URL ist dynamisch -> klassisches img statt next/image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.url}
        alt={current.caption ?? "Familienfoto"}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
          fadeIn ? "opacity-100" : "opacity-0"
        }`}
      />
      {current.caption ? (
        <div className="absolute left-0 right-0 top-6 flex justify-center">
          <span className="rounded-xl bg-black/50 px-6 py-2 text-2xl text-white backdrop-blur-sm">
            {current.caption}
          </span>
        </div>
      ) : null}
    </div>
  );
}
