"use client";

// Slide 4: Quartierskarte — SVG-Strassen mit Dot-Wave

export function SlideMap() {
  // Haeuser-Punkte pro Strasse
  const streets = [
    { name: "Purkersdorfer Str.", y: 55, points: [30, 55, 80, 105, 130, 155, 180, 205, 230, 255, 280, 295, 310, 325], color: "#4CAF87" },
    { name: "Sanarystraße", y: 120, points: [45, 70, 95, 120, 145, 170, 195, 220, 245, 270, 290, 310], color: "#4CAF87" },
    { name: "Oberer Rebberg", y: 185, points: [60, 90, 120, 150, 180, 210, 240, 270, 295, 315], color: "#4CAF87" },
  ];

  const userHouseStreet = 0; // Purkersdorfer
  const userHouseIndex = 5; // Haus Nr. 6

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      {/* Quartiers-Glow Hintergrund */}
      <div className="relative mb-6 w-full max-w-[340px]">
        <div className="absolute inset-0 rounded-2xl bg-quartier-green/5" />

        <svg
          viewBox="0 0 360 240"
          className="w-full"
          style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.05))" }}
        >
          {/* Hintergrund */}
          <rect x="10" y="10" width="340" height="220" rx="12" fill="white" stroke="#E5E7EB" strokeWidth="1" />

          {/* Strassen */}
          {streets.map((street, si) => (
            <g key={si}>
              {/* Strassen-Linie */}
              <line
                x1="20"
                y1={street.y}
                x2="340"
                y2={street.y}
                stroke="#D1D5DB"
                strokeWidth="2"
                strokeDasharray="320"
                strokeDashoffset="320"
                className="animate-street-draw"
                style={{ animationDelay: `${si * 300}ms` }}
              />

              {/* Strassen-Name */}
              <text
                x="24"
                y={street.y - 10}
                className="animate-fade-in-up"
                style={{ animationDelay: `${si * 300 + 200}ms`, fontSize: "8px", fill: "#9CA3AF", fontWeight: 500 }}
              >
                {street.name}
              </text>

              {/* Haeuser-Punkte */}
              {street.points.map((px, pi) => {
                const isUserHouse = si === userHouseStreet && pi === userHouseIndex;
                return (
                  <g key={pi}>
                    <circle
                      cx={px}
                      cy={street.y}
                      r={isUserHouse ? 0 : 0}
                      fill={street.color}
                      className="animate-dot-appear"
                      style={{
                        animationDelay: `${si * 300 + 500 + pi * 60}ms`,
                        transformOrigin: `${px}px ${street.y}px`,
                      }}
                    >
                      <animate
                        attributeName="r"
                        from="0"
                        to={isUserHouse ? "6" : "3.5"}
                        dur="0.3s"
                        begin={`${(si * 300 + 500 + pi * 60) / 1000}s`}
                        fill="freeze"
                      />
                    </circle>

                    {/* "Sie sind hier" Ring */}
                    {isUserHouse && (
                      <>
                        <circle
                          cx={px}
                          cy={street.y}
                          r="0"
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="2"
                          className="animate-you-are-here"
                          style={{ animationDelay: "2200ms", transformOrigin: `${px}px ${street.y}px` }}
                        >
                          <animate
                            attributeName="r"
                            from="0"
                            to="12"
                            dur="0.5s"
                            begin="2.2s"
                            fill="freeze"
                          />
                        </circle>
                        <text
                          x={px}
                          y={street.y + 24}
                          textAnchor="middle"
                          className="animate-fade-in-up"
                          style={{ animationDelay: "2500ms", fontSize: "7px", fill: "#F59E0B", fontWeight: 600 }}
                        >
                          Sie sind hier
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      {/* Text */}
      <div className="text-center animate-fade-in-up" style={{ animationDelay: "800ms" }}>
        <h1 className="text-2xl font-bold text-anthrazit">
          Ihr Quartier auf einen Blick
        </h1>
        <p className="mt-2 text-base text-muted-foreground leading-relaxed">
          Sehen Sie, wer in Ihrer Nachbarschaft aktiv ist.
          Alles anonym und DSGVO-konform.
        </p>
      </div>

      {/* Legende */}
      <div className="mt-4 flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: "1600ms" }}>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-quartier-green" />
          <span className="text-xs text-muted-foreground">Aktiver Nachbar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full border-2 border-alert-amber" />
          <span className="text-xs text-muted-foreground">Ihre Position</span>
        </div>
      </div>
    </div>
  );
}
