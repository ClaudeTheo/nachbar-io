// components/youth/PointsDisplay.tsx
// Jugend-Modul: Kompakte Punkte-Anzeige

interface PointsDisplayProps {
  points: number;
  className?: string;
}

export function PointsDisplay({ points, className = '' }: PointsDisplayProps) {
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
