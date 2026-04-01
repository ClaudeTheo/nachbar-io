// modules/care/components/navigator/PflegegradBar.tsx
// Horizontaler Balken (0-100) mit farbigen Pflegegrad-Zonen und animiertem Marker
"use client";

import { useEffect, useState } from "react";

interface PflegegradBarProps {
  score: number; // 0-100 gewichteter Gesamtwert
  pflegegrad: number; // 0-5
}

// Pflegegrad-Zonen mit Farben
const ZONES = [
  { label: "Kein PG", min: 0, max: 12.5, color: "#E5E7EB" },
  { label: "PG 1", min: 12.5, max: 27, color: "#86EFAC" },
  { label: "PG 2", min: 27, max: 47.5, color: "#4CAF87" },
  { label: "PG 3", min: 47.5, max: 70, color: "#F59E0B" },
  { label: "PG 4", min: 70, max: 90, color: "#F97316" },
  { label: "PG 5", min: 90, max: 100, color: "#EF4444" },
];

export function PflegegradBar({ score, pflegegrad }: PflegegradBarProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animierter Einblick
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const markerPosition = Math.min(100, Math.max(0, animatedScore));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-anthrazit">Gewichtete Punktzahl</span>
        <span className="font-bold text-lg text-anthrazit">{score.toFixed(1)} / 100</span>
      </div>

      {/* Balken mit Zonen */}
      <div className="relative">
        <div className="flex h-8 rounded-lg overflow-hidden border border-gray-200">
          {ZONES.map((zone) => (
            <div
              key={zone.label}
              className="relative h-full"
              style={{
                width: `${zone.max - zone.min}%`,
                backgroundColor: zone.color,
              }}
            >
              {/* Zone-Label (nur auf groesserem Screen) */}
              <span className="hidden sm:block absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/90 mix-blend-difference">
                {zone.label}
              </span>
            </div>
          ))}
        </div>

        {/* Animierter Marker */}
        <div
          className="absolute top-0 h-8 w-0.5 bg-anthrazit transition-all duration-1000 ease-out"
          style={{ left: `${markerPosition}%` }}
        >
          {/* Pfeil oben */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="inline-block px-2 py-0.5 rounded-md bg-anthrazit text-white text-xs font-bold animate-pulse">
              {score.toFixed(1)}
            </span>
          </div>
          {/* Pfeil unten */}
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-anthrazit rotate-45" />
        </div>
      </div>

      {/* Legende mobil */}
      <div className="flex flex-wrap gap-2 sm:hidden">
        {ZONES.map((zone) => (
          <span key={zone.label} className="flex items-center gap-1 text-xs text-muted-foreground">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: zone.color }}
            />
            {zone.label}
          </span>
        ))}
      </div>

      {/* Ergebnis-Text */}
      <div className="text-center py-2">
        <p className="text-sm text-muted-foreground">Geschätzter Pflegegrad</p>
        <p className="text-4xl font-bold text-anthrazit mt-1">
          {pflegegrad === 0 ? "Kein Pflegegrad" : `Pflegegrad ${pflegegrad}`}
        </p>
      </div>
    </div>
  );
}
