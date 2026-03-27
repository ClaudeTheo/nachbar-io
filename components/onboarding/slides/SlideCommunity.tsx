"use client";

import { Calendar, MessageCircle, Newspaper, Sparkles } from "lucide-react";

// Slide 5: Gemeinsam leben — Events, Nachrichten, News

export function SlideCommunity() {
  const cards = [
    {
      icon: <Calendar className="h-5 w-5 text-quartier-green" />,
      title: "Straßenfest Samstag 14:00",
      subtitle: "12 Zusagen · Purkersdorfer Str.",
      borderColor: "border-l-quartier-green",
      bgColor: "bg-quartier-green/5",
      direction: "animate-slide-from-left",
      delay: 0,
    },
    {
      icon: <MessageCircle className="h-5 w-5 text-blue-500" />,
      title: "Neue Nachricht von Anna K.",
      subtitle: "\"Können Sie Freitag beim Umzug...\"",
      borderColor: "border-l-blue-400",
      bgColor: "bg-blue-50",
      direction: "animate-slide-from-right",
      delay: 400,
    },
    {
      icon: <Newspaper className="h-5 w-5 text-alert-amber" />,
      title: "Quartiersnews",
      subtitle: "Kanalarbeiten ab Montag in der Sanarystr.",
      borderColor: "border-l-alert-amber",
      bgColor: "bg-amber-50",
      direction: "animate-slide-from-left",
      delay: 800,
      hasSparkle: true,
    },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      {/* Gestapelte Karten */}
      <div className="w-full max-w-[300px] space-y-3 mb-8">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`rounded-xl border-l-4 ${card.borderColor} ${card.bgColor} p-4 shadow-sm ${card.direction}`}
            style={{ animationDelay: `${card.delay}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">{card.icon}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-anthrazit truncate">{card.title}</p>
                  {card.hasSparkle && (
                    <Sparkles className="h-3.5 w-3.5 text-alert-amber animate-sparkle shrink-0" style={{ animationDelay: "1400ms" }} />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{card.subtitle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* KI-Hinweis */}
      <div className="mb-6 animate-fade-in-up" style={{ animationDelay: "1200ms" }}>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1">
          <Sparkles className="h-3 w-3 text-alert-amber" />
          <span className="text-[11px] text-amber-700">
            Quartiersnews automatisch von KI zusammengefasst
          </span>
        </div>
      </div>

      {/* Text */}
      <div className="text-center animate-fade-in-up" style={{ animationDelay: "600ms" }}>
        <h1 className="text-2xl font-bold text-anthrazit">
          Gemeinsam leben
        </h1>
        <p className="mt-2 text-base text-muted-foreground leading-relaxed">
          Events planen, Nachrichten austauschen und
          lokale Neuigkeiten auf einen Blick.
        </p>
      </div>
    </div>
  );
}
