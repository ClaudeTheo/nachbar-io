// modules/youth/components/PointsDisplay.tsx
// Jugend-Modul: Kompakte Punkte-Anzeige

interface PointsDisplayProps {
  points: number;
  className?: string;
  variant?: "default" | "youth";
}

export function PointsDisplay({
  points,
  className = "",
  variant = "default",
}: PointsDisplayProps) {
  if (variant === "youth") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300/14 text-lime-100 ring-1 ring-lime-100/25">
          <span className="text-xl" aria-hidden="true">★</span>
        </div>
        <div>
          <p className="text-3xl font-black leading-none text-white">
            {points}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-50/58">
            Punkte
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
        <span className="text-green-700 text-lg" aria-hidden="true">★</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-anthrazit">{points}</p>
        <p className="text-sm text-gray-500">Punkte</p>
      </div>
    </div>
  );
}
