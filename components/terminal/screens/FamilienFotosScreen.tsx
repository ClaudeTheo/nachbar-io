"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { useTerminal } from "@/lib/terminal/TerminalContext";

interface KioskPhoto {
  id: string;
  url: string | null;
  caption: string | null;
  pinned: boolean;
  createdAt: string;
}

export default function FamilienFotosScreen() {
  const { setActiveScreen, token } = useTerminal();
  const [photos, setPhotos] = useState<KioskPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPhotos() {
      try {
        const res = await fetch(`/api/device/photos?token=${encodeURIComponent(token)}`);
        if (!res.ok) throw new Error("Fehler beim Laden");
        const data = await res.json();
        setPhotos(data.photos ?? []);
      } catch (err) {
        console.error("[FamilienFotos] Fehler:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPhotos();
  }, [token]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Touch-Swipe Erkennung
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 60) {
      if (diff > 0) goPrev();
      else goNext();
    }
    setTouchStartX(null);
  };

  // Leer-Zustand
  if (!loading && photos.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setActiveScreen("home")}
            className="flex items-center justify-center h-[70px] w-[70px] rounded-2xl bg-anthrazit text-white active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-10 w-10" />
          </button>
          <h1 className="text-[36px] font-bold text-anthrazit">Familienfotos</h1>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-6">
          <Camera className="h-24 w-24 text-anthrazit-light/40" />
          <p className="text-[32px] font-medium text-anthrazit/60 text-center">
            Noch keine Fotos vorhanden
          </p>
          <p className="text-[22px] text-anthrazit/40 text-center">
            Ihre Angehörigen können Fotos über die App senden
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[32px] text-anthrazit/60">Fotos werden geladen...</p>
      </div>
    );
  }

  const photo = photos[currentIndex];

  return (
    <div
      className="relative flex flex-col h-full bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Zurueck-Button */}
      <button
        onClick={() => setActiveScreen("home")}
        className="absolute top-4 left-4 z-10 flex items-center justify-center h-[70px] w-[70px] rounded-2xl bg-black/50 text-white active:scale-95 transition-transform"
      >
        <ArrowLeft className="h-10 w-10" />
      </button>

      {/* Zaehler */}
      <div className="absolute top-4 right-4 z-10 bg-black/50 rounded-xl px-4 py-2">
        <span className="text-[20px] text-white/80">
          {currentIndex + 1} / {photos.length}
        </span>
      </div>

      {/* Foto */}
      <div className="flex-1 flex items-center justify-center">
        {photo?.url ? (
          <img
            src={photo.url}
            alt={photo.caption || "Familienfoto"}
            className="max-h-full max-w-full object-contain transition-opacity duration-500"
          />
        ) : (
          <Camera className="h-24 w-24 text-white/20" />
        )}
      </div>

      {/* Navigation-Pfeile */}
      {photos.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-[80px] w-[60px] flex items-center justify-center rounded-2xl bg-black/30 text-white active:bg-black/50"
          >
            <ChevronLeft className="h-12 w-12" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-[80px] w-[60px] flex items-center justify-center rounded-2xl bg-black/30 text-white active:bg-black/50"
          >
            <ChevronRight className="h-12 w-12" />
          </button>
        </>
      )}

      {/* Caption */}
      {photo?.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-6 py-4">
          <p className="text-[24px] text-white text-center">{photo.caption}</p>
        </div>
      )}
    </div>
  );
}
