"use client";

import { useRef, useState, useCallback } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";

interface SlideVideoProps {
  /** Welches Video zeigen: "welcome" (erstes Onboarding) oder "welcome-v2" (wiederkehrend) */
  variant?: "welcome" | "welcome-v2";
}

/**
 * SlideVideo — Willkommensvideo im Onboarding (Slide 3 von 4).
 *
 * Zeigt das QuartierApp Promo-Video mit emotionalem Einstieg.
 * Autoplay ist stumm (Browser-Policy), Nutzer kann Ton einschalten.
 * Nativer Video-Player mit Vollbild-Option für Senioren.
 *
 * Zwei Varianten:
 * - "welcome": Erstes Onboarding nach Registrierung
 * - "welcome-v2": Wiederkehrender Besuch / Dashboard-Karte
 */
export default function SlideVideo({ variant = "welcome" }: SlideVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Ton ein-/ausschalten
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Video manuell starten (Fallback wenn Autoplay blockiert)
  const handlePlay = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay blockiert — Nutzer muss manuell starten
      });
    }
  }, []);

  // Video hat angefangen zu spielen
  const handlePlaying = useCallback(() => {
    setIsPlaying(true);
    setHasStarted(true);
  }, []);

  // Video ist zu Ende
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      {/* Überschrift */}
      <div className="mb-4 text-center animate-fade-in-up">
        <h2 className="text-2xl font-bold text-[#2D3142]">
          Entdecken Sie Ihr Quartier
        </h2>
        <p className="mt-1 text-sm text-[#2D3142]/60">
          Sehen Sie, was QuartierApp für Sie bereithält
        </p>
      </div>

      {/* Video-Container */}
      <div
        className="relative w-full max-w-md animate-fade-in-up"
        style={{ animationDelay: "200ms" }}
      >
        <div className="relative overflow-hidden rounded-2xl shadow-lg bg-black">
          <video
            ref={videoRef}
            src={`/videos/${variant}.mp4`}
            className="w-full aspect-video"
            autoPlay
            muted
            playsInline
            preload="auto"
            onPlay={handlePlaying}
            onEnded={handleEnded}
            onPause={() => setIsPlaying(false)}
          />

          {/* Play-Overlay (wenn Video nicht spielt und noch nicht gestartet) */}
          {!isPlaying && !hasStarted && (
            <button
              onClick={handlePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity"
              aria-label="Video abspielen"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4CAF87] shadow-lg">
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
            </button>
          )}

          {/* Replay-Button (wenn Video zu Ende) */}
          {!isPlaying && hasStarted && (
            <button
              onClick={handlePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity"
              aria-label="Video erneut abspielen"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4CAF87]/90 shadow-lg">
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
              <span className="absolute bottom-4 text-white/80 text-sm">
                Nochmal ansehen
              </span>
            </button>
          )}
        </div>

        {/* Ton-Button */}
        <button
          onClick={toggleMute}
          className="mt-3 mx-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors bg-[#2D3142]/5 text-[#2D3142]/70 hover:bg-[#2D3142]/10 active:bg-[#2D3142]/15"
          style={{ minHeight: "44px" }}
          aria-label={isMuted ? "Ton einschalten" : "Ton ausschalten"}
        >
          {isMuted ? (
            <>
              <VolumeX className="h-5 w-5" />
              <span>Ton einschalten</span>
            </>
          ) : (
            <>
              <Volume2 className="h-5 w-5 text-[#4CAF87]" />
              <span className="text-[#4CAF87]">Ton ist an</span>
            </>
          )}
        </button>
      </div>

      {/* Vertrauens-Hinweis */}
      <p
        className="mt-4 text-center text-xs text-[#2D3142]/40 animate-fade-in-up"
        style={{ animationDelay: "600ms" }}
      >
        Kostenlos · DSGVO-konform · Made in Germany
      </p>
    </div>
  );
}
