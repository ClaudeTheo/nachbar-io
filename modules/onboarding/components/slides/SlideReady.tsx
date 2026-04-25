"use client";

import { Check } from "lucide-react";

// Slide 6: Los gehts — Haekchen + Confetti

interface SlideReadyProps {
  displayName: string;
}

export function SlideReady({ displayName }: SlideReadyProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      {/* Großes Haekchen */}
      <div className="relative mb-8">
        {/* Äußerer Ring mit Glow */}
        <div className="animate-check-bounce flex h-28 w-28 items-center justify-center rounded-full bg-quartier-green shadow-lg shadow-quartier-green/30">
          <Check className="h-14 w-14 text-white" strokeWidth={3} />
        </div>

        {/* Leucht-Ring */}
        <div className="absolute inset-0 rounded-full animate-glow-pulse" />
      </div>

      {/* Persoenliche Begruessung */}
      <div className="text-center animate-fade-in-up" style={{ animationDelay: "400ms" }}>
        <h1 className="text-2xl font-bold text-anthrazit">
          Willkommen{displayName ? `, ${displayName}` : ""}!
        </h1>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed">
          Sie sind jetzt Teil der Nachbarschaft.
          <br />
          Entdecken Sie Ihr Quartier.
        </p>
      </div>

      {/* Feature-Zusammenfassung */}
      <div className="mt-8 grid grid-cols-3 gap-3 animate-fade-in-up" style={{ animationDelay: "800ms" }}>
        {[
          { emoji: "🆘", label: "Soforthilfe" },
          { emoji: "🤝", label: "Hilfe-Börse" },
          { emoji: "🛍️", label: "Marktplatz" },
          { emoji: "🗺️", label: "Karte" },
          { emoji: "📅", label: "Events" },
          { emoji: "💬", label: "Chat" },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-1 rounded-lg bg-white p-2 shadow-sm border">
            <span className="text-lg">{item.emoji}</span>
            <span className="text-[10px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      <p className="mt-5 max-w-[300px] text-center text-xs leading-relaxed text-muted-foreground animate-fade-in-up" style={{ animationDelay: "1000ms" }}>
        KI-Hilfe kommt schrittweise und nur mit Einwilligung. Die App
        funktioniert auch ohne KI weiter.
      </p>
    </div>
  );
}
