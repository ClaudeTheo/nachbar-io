"use client";

// Praevention — Stimmungs-Check Widget
// 3 Icons (Sonne/Wolke/Regen), 80px Touch-Targets, optional Skip

import { Sun, Cloud, CloudRain } from "lucide-react";

interface MoodCheckProps {
  /** Titel ueber dem Widget */
  title?: string;
  /** Callback mit Stimmungswert: 1=gut, 2=geht so, 3=schlecht */
  onSelect: (mood: number) => void;
  /** Ueberspringen erlaubt? */
  skippable?: boolean;
  /** Callback fuer Skip */
  onSkip?: () => void;
}

const MOODS = [
  {
    value: 1,
    label: "Gut",
    icon: Sun,
    color: "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-300",
    selectedColor: "bg-amber-500 text-white border-amber-600",
  },
  {
    value: 2,
    label: "Geht so",
    icon: Cloud,
    color: "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300",
    selectedColor: "bg-gray-500 text-white border-gray-600",
  },
  {
    value: 3,
    label: "Schlecht",
    icon: CloudRain,
    color: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300",
    selectedColor: "bg-blue-500 text-white border-blue-600",
  },
];

export default function MoodCheck({
  title = "Wie geht es Ihnen gerade?",
  onSelect,
  skippable = true,
  onSkip,
}: MoodCheckProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>

      <div className="flex gap-4">
        {MOODS.map((mood) => {
          const Icon = mood.icon;
          return (
            <button
              key={mood.value}
              onClick={() => onSelect(mood.value)}
              className={`flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 transition-all active:scale-95 ${mood.color}`}
              aria-label={mood.label}
            >
              <Icon className="h-8 w-8" />
              <span className="mt-1 text-xs font-medium">{mood.label}</span>
            </button>
          );
        })}
      </div>

      {skippable && onSkip && (
        <button
          onClick={onSkip}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Überspringen
        </button>
      )}
    </div>
  );
}
