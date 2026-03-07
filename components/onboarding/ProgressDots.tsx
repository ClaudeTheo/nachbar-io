"use client";

interface ProgressDotsProps {
  current: number;
  total: number;
  onDotClick: (index: number) => void;
}

export function ProgressDots({ current, total, onDotClick }: ProgressDotsProps) {
  return (
    <div className="flex items-center justify-center gap-2" role="tablist">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onDotClick(i)}
          role="tab"
          aria-selected={i === current}
          aria-label={`Schritt ${i + 1} von ${total}`}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? "h-2.5 w-2.5 bg-quartier-green"
              : i < current
              ? "h-2 w-2 bg-quartier-green/50"
              : "h-2 w-2 bg-gray-300"
          }`}
        />
      ))}
    </div>
  );
}
