"use client";

import { Gift, RefreshCw, Search } from "lucide-react";

// Slide 3: Marktplatz & Fundbüro — Regal mit bouncenden Items

export function SlideMarketplace() {
  const items = [
    { icon: <Gift className="h-5 w-5 text-purple-500" />, label: "Kindervelo", tag: "Geschenkt", tagColor: "bg-purple-100 text-purple-600", delay: 300 },
    { icon: <RefreshCw className="h-5 w-5 text-blue-500" />, label: "Bohrmaschine", tag: "Verleihen", tagColor: "bg-blue-100 text-blue-600", delay: 500 },
    { icon: <Search className="h-5 w-5 text-alert-amber" />, label: "Suche Leiter", tag: "Gesucht", tagColor: "bg-amber-100 text-amber-600", delay: 700 },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      {/* Regal */}
      <div className="w-full max-w-[300px] mb-6">
        {/* Items */}
        <div className="flex justify-center gap-3 mb-2">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex w-24 flex-col items-center rounded-xl bg-white p-3 shadow-sm border animate-item-bounce"
              style={{ animationDelay: `${item.delay}ms` }}
            >
              <div className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                {item.icon}
              </div>
              <p className="text-[11px] font-medium text-anthrazit text-center leading-tight">{item.label}</p>
              <span className={`mt-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${item.tagColor}`}>
                {item.tag}
              </span>
            </div>
          ))}
        </div>

        {/* Regal-Linie */}
        <div className="h-1 rounded-full bg-anthrazit/20 animate-shelf-slide" />
      </div>

      {/* Fundbüro-Karte (flip-Effekt) */}
      <div
        className="w-full max-w-[280px] rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4 animate-fade-in-up"
        style={{ animationDelay: "1200ms" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
            <span className="text-lg">🔑</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-anthrazit">Schlüsselbund gefunden</p>
            <p className="text-[11px] text-muted-foreground">
              📍 Nähe Purkersdorfer Str. 8
            </p>
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="mt-8 text-center animate-fade-in-up" style={{ animationDelay: "900ms" }}>
        <h1 className="text-2xl font-bold text-anthrazit">
          Teilen statt Kaufen
        </h1>
        <p className="mt-2 text-base text-muted-foreground leading-relaxed">
          Verkaufen, verschenken oder verleihen Sie an Nachbarn.
          Plus: Ihr Quartiers-Fundbüro.
        </p>
      </div>
    </div>
  );
}
