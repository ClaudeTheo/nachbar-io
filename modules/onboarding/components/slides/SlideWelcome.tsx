"use client";

// Slide 0: Willkommen — 3 Häuser mit leuchtenden Fenstern

export function SlideWelcome() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      {/* Häuser-Illustration */}
      <div className="relative mb-10 flex items-end justify-center gap-4">
        {/* Haus links (klein) */}
        <div className="animate-house-build" style={{ animationDelay: "0ms" }}>
          <div className="relative">
            {/* Dach */}
            <div className="mx-auto h-0 w-0 border-l-[32px] border-r-[32px] border-b-[28px] border-l-transparent border-r-transparent border-b-anthrazit" />
            {/* Koerper */}
            <div className="h-16 w-16 bg-anthrazit rounded-b-md flex flex-wrap items-center justify-center gap-1 p-2">
              <div className="animate-window-glow h-4 w-4 rounded-sm bg-transparent border border-gray-600" style={{ animationDelay: "600ms" }} />
              <div className="animate-window-glow h-4 w-4 rounded-sm bg-transparent border border-gray-600" style={{ animationDelay: "900ms" }} />
              <div className="animate-window-glow h-4 w-4 rounded-sm bg-transparent border border-gray-600" style={{ animationDelay: "1200ms" }} />
              <div className="animate-window-glow h-4 w-4 rounded-sm bg-transparent border border-gray-600" style={{ animationDelay: "1500ms" }} />
            </div>
          </div>
        </div>

        {/* Haus Mitte (groß — Ihr Haus) */}
        <div className="animate-house-build" style={{ animationDelay: "200ms" }}>
          <div className="relative">
            {/* Dach */}
            <div className="mx-auto h-0 w-0 border-l-[44px] border-r-[44px] border-b-[36px] border-l-transparent border-r-transparent border-b-anthrazit" />
            {/* Koerper */}
            <div className="h-24 w-[88px] bg-anthrazit rounded-b-md flex flex-wrap items-center justify-center gap-1.5 p-3">
              <div className="animate-window-glow h-5 w-5 rounded-sm bg-transparent border border-gray-600" style={{ animationDelay: "700ms" }} />
              <div className="animate-window-glow h-5 w-5 rounded-sm bg-transparent border border-gray-600" style={{ animationDelay: "1000ms" }} />
              <div className="animate-window-glow h-5 w-5 rounded-sm bg-transparent border border-gray-600" style={{ animationDelay: "1300ms" }} />
              <div className="animate-window-glow h-5 w-5 rounded-sm bg-transparent border border-gray-600" style={{ animationDelay: "1600ms" }} />
              {/* Tuer */}
              <div className="h-8 w-6 rounded-t-md bg-quartier-green/80 mt-1" />
            </div>
            {/* "Ihr Haus" Indikator */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-quartier-green animate-fade-in-up" style={{ animationDelay: "1800ms" }}>
              Ihr Zuhause
            </div>
          </div>
        </div>

        {/* Haus rechts (klein) */}
        <div className="animate-house-build" style={{ animationDelay: "400ms" }}>
          <div className="relative">
            {/* Dach */}
            <div className="mx-auto h-0 w-0 border-l-[28px] border-r-[28px] border-b-[24px] border-l-transparent border-r-transparent border-b-anthrazit" />
            {/* Koerper */}
            <div className="h-14 w-14 bg-anthrazit rounded-b-md flex flex-wrap items-center justify-center gap-1 p-2">
              <div className="animate-window-glow h-3.5 w-3.5 rounded-sm bg-transparent border border-gray-600" style={{ animationDelay: "800ms" }} />
              <div className="animate-window-glow h-3.5 w-3.5 rounded-sm bg-transparent border border-gray-600" style={{ animationDelay: "1100ms" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="mt-8 text-center animate-fade-in-up" style={{ animationDelay: "1000ms" }}>
        <h1 className="text-2xl font-bold text-anthrazit">
          Willkommen bei QuartierApp
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Ihr digitaler Dorfplatz für die Nachbarschaft
        </p>
      </div>

      {/* Straßen-Badge */}
      <div className="mt-6 animate-fade-in-up" style={{ animationDelay: "1400ms" }}>
        <div className="inline-flex items-center gap-2 rounded-full border border-quartier-green/30 bg-quartier-green/5 px-4 py-2">
          <div className="h-2 w-2 rounded-full bg-quartier-green animate-pulse" />
          <span className="text-sm text-anthrazit">
            Purkersdorfer Str. · Sanarystr. · Oberer Rebberg
          </span>
        </div>
      </div>
    </div>
  );
}
