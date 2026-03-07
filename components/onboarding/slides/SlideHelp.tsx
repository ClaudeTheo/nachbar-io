"use client";

import { HandHelping, Wrench, Heart } from "lucide-react";

// Slide 2: Hilfe-Boerse — Zwei Karten teilen sich, Herz erscheint

export function SlideHelp() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      {/* Karten-Paar */}
      <div className="relative mb-6 flex items-center gap-4">
        {/* Linke Karte: Hilfe suchen */}
        <div
          className="w-36 rounded-xl border-2 border-alert-amber/30 bg-alert-amber/5 p-4 animate-card-split-left"
          style={{ animationDelay: "0ms" }}
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-alert-amber/10">
              <HandHelping className="h-6 w-6 text-alert-amber" />
            </div>
            <p className="text-xs font-semibold text-anthrazit">Einkaufshilfe gesucht</p>
            <span className="mt-1 inline-block rounded-full bg-alert-amber/10 px-2 py-0.5 text-[10px] font-medium text-alert-amber">
              Gesucht
            </span>
          </div>
        </div>

        {/* Herz in der Mitte */}
        <div
          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 animate-heart-pop"
          style={{ animationDelay: "1200ms" }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg">
            <Heart className="h-5 w-5 fill-red-400 text-red-400" />
          </div>
        </div>

        {/* Rechte Karte: Hilfe anbieten */}
        <div
          className="w-36 rounded-xl border-2 border-quartier-green/30 bg-quartier-green/5 p-4 animate-card-split-right"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-quartier-green/10">
              <Wrench className="h-6 w-6 text-quartier-green" />
            </div>
            <p className="text-xs font-semibold text-anthrazit">Biete Gartenarbeit</p>
            <span className="mt-1 inline-block rounded-full bg-quartier-green/10 px-2 py-0.5 text-[10px] font-medium text-quartier-green">
              Angebot
            </span>
          </div>
        </div>
      </div>

      {/* Verbindungs-Linie (SVG) */}
      <svg
        width="200"
        height="24"
        viewBox="0 0 200 24"
        className="mb-4"
        style={{ animationDelay: "800ms" }}
      >
        <path
          d="M 20 12 Q 100 -10 180 12"
          fill="none"
          stroke="#9CA3AF"
          strokeWidth="2"
          strokeDasharray="6 4"
          className="animate-street-draw"
          style={{ strokeDashoffset: 100, animationDelay: "800ms" }}
        />
      </svg>

      {/* Text */}
      <div className="mt-4 text-center animate-fade-in-up" style={{ animationDelay: "600ms" }}>
        <h1 className="text-2xl font-bold text-anthrazit">
          Geben und Nehmen
        </h1>
        <p className="mt-2 text-base text-muted-foreground leading-relaxed">
          Bieten Sie Hilfe an oder finden Sie Unterstuetzung.
          Vom Einkaufsdienst bis zur Gartenarbeit.
        </p>
      </div>
    </div>
  );
}
