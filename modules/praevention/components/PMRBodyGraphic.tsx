"use client";

// Praevention — PMR Koerper-Grafik
// SVG Koerperschema mit 7 Muskelgruppen, aktive Gruppe hervorgehoben

interface PMRBodyGraphicProps {
  /** Aktive Muskelgruppe (0-6), null = keine */
  activeGroup: number | null;
  /** Abgeschlossene Gruppen */
  completedGroups?: number[];
}

// 7 Muskelgruppen nach PMR (Kurzform)
const MUSCLE_GROUPS = [
  { id: 0, name: "Hände", y: 180, height: 30 },
  { id: 1, name: "Gesicht", y: 20, height: 35 },
  { id: 2, name: "Nacken & Schultern", y: 60, height: 30 },
  { id: 3, name: "Bauch", y: 120, height: 35 },
  { id: 4, name: "Oberschenkel", y: 210, height: 40 },
  { id: 5, name: "Unterschenkel & Füße", y: 260, height: 40 },
  { id: 6, name: "Ganzer Körper", y: 0, height: 310 },
];

export default function PMRBodyGraphic({
  activeGroup,
  completedGroups = [],
}: PMRBodyGraphicProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        viewBox="0 0 120 320"
        className="h-64 w-auto"
        aria-label="Körperschema für Progressive Muskelrelaxation"
      >
        {/* Koerper-Silhouette */}
        <ellipse
          cx="60"
          cy="25"
          rx="18"
          ry="22"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth="1"
        />
        <rect
          x="42"
          y="55"
          width="36"
          height="65"
          rx="8"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth="1"
        />
        {/* Arme */}
        <rect
          x="12"
          y="62"
          width="26"
          height="14"
          rx="7"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth="1"
        />
        <rect
          x="82"
          y="62"
          width="26"
          height="14"
          rx="7"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth="1"
        />
        {/* Haende */}
        <ellipse
          cx="8"
          cy="69"
          rx="7"
          ry="9"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth="1"
        />
        <ellipse
          cx="112"
          cy="69"
          rx="7"
          ry="9"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth="1"
        />
        {/* Beine */}
        <rect
          x="42"
          y="125"
          width="15"
          height="70"
          rx="6"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth="1"
        />
        <rect
          x="63"
          y="125"
          width="15"
          height="70"
          rx="6"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth="1"
        />
        {/* Fuesse */}
        <ellipse
          cx="49"
          cy="200"
          rx="10"
          ry="7"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth="1"
        />
        <ellipse
          cx="71"
          cy="200"
          rx="10"
          ry="7"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth="1"
        />

        {/* Muskelgruppen-Overlay */}
        {MUSCLE_GROUPS.filter((g) => g.id !== 6).map((group) => {
          const isActive = activeGroup === group.id;
          const isCompleted = completedGroups.includes(group.id);
          const fill = isActive
            ? "rgba(16, 185, 129, 0.5)"
            : isCompleted
              ? "rgba(16, 185, 129, 0.2)"
              : "transparent";

          return (
            <rect
              key={group.id}
              x="5"
              y={group.y + 10}
              width="110"
              height={group.height}
              rx="4"
              fill={fill}
              stroke={isActive ? "#10b981" : "transparent"}
              strokeWidth={isActive ? 2 : 0}
              className={isActive ? "animate-pulse" : ""}
            />
          );
        })}

        {/* Ganzer Koerper Overlay (Gruppe 6) */}
        {activeGroup === 6 && (
          <rect
            x="2"
            y="2"
            width="116"
            height="210"
            rx="8"
            fill="rgba(16, 185, 129, 0.3)"
            stroke="#10b981"
            strokeWidth="2"
            className="animate-pulse"
          />
        )}
      </svg>

      {/* Aktive Gruppe Label */}
      {activeGroup !== null && (
        <div className="rounded-full bg-emerald-100 px-4 py-2 text-center">
          <p className="text-sm font-semibold text-emerald-800">
            {MUSCLE_GROUPS[activeGroup].name}
          </p>
          <p className="text-xs text-emerald-600">
            {activeGroup === 6
              ? "Alles anspannen"
              : "Anspannen... halten... loslassen"}
          </p>
        </div>
      )}

      {/* Fortschritt */}
      <div className="flex gap-1.5">
        {MUSCLE_GROUPS.map((group) => (
          <div
            key={group.id}
            className={`h-2 w-6 rounded-full ${
              activeGroup === group.id
                ? "bg-emerald-500"
                : completedGroups.includes(group.id)
                  ? "bg-emerald-300"
                  : "bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
