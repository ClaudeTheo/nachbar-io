"use client";

import { Bell } from "lucide-react";

// Slide 1: Soforthilfe — Glocke mit Puls-Ringen + Mock-Alert

export function SlideEmergency() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      {/* Glocke mit Puls-Ringen */}
      <div className="relative mb-8 flex items-center justify-center">
        {/* Puls-Ringe */}
        <div className="absolute h-20 w-20 rounded-full border-2 border-alert-amber/40 animate-pulse-ring" style={{ animationDelay: "0ms" }} />
        <div className="absolute h-20 w-20 rounded-full border-2 border-alert-amber/30 animate-pulse-ring" style={{ animationDelay: "300ms" }} />
        <div className="absolute h-20 w-20 rounded-full border-2 border-alert-amber/20 animate-pulse-ring" style={{ animationDelay: "600ms" }} />

        {/* Glocke */}
        <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-alert-amber animate-check-bounce">
          <Bell className="h-10 w-10 text-white" />
        </div>
      </div>

      {/* Mock Alert-Karte */}
      <div className="w-full max-w-[300px] space-y-2">
        <div
          className="rounded-xl border-l-4 border-l-alert-amber bg-white p-4 shadow-md animate-slide-in-right"
          style={{ animationDelay: "1000ms" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">💧</span>
            <div>
              <p className="font-semibold text-anthrazit text-sm">Wasserschaden Keller</p>
              <p className="text-[11px] text-muted-foreground">
                Purkersdorfer Str. 12 · vor 2 Min.
              </p>
            </div>
          </div>
        </div>

        {/* Antwort-Badge */}
        <div
          className="ml-8 inline-flex items-center gap-2 rounded-full bg-quartier-green/10 px-3 py-1.5 animate-fade-in-up"
          style={{ animationDelay: "1800ms" }}
        >
          <div className="h-2 w-2 rounded-full bg-quartier-green" />
          <span className="text-xs font-medium text-quartier-green">
            Thomas M. ist unterwegs!
          </span>
        </div>
      </div>

      {/* Text */}
      <div className="mt-10 text-center animate-fade-in-up" style={{ animationDelay: "1200ms" }}>
        <h1 className="text-2xl font-bold text-anthrazit">
          Soforthilfe in Sekunden
        </h1>
        <p className="mt-2 text-base text-muted-foreground leading-relaxed">
          Wasserschaden? Stromausfall? Ihre Nachbarn sehen Ihren
          Hilferuf sofort — und reagieren direkt.
        </p>
      </div>
    </div>
  );
}
