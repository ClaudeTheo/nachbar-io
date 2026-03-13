"use client";

import { Heart, AlertTriangle, Pill, Video, Newspaper } from "lucide-react";

/**
 * Terminal-Sidebar: 5 Aktions-Buttons, immer sichtbar.
 * Jeder Button fuellt die gleiche Hoehe (flex-1).
 * Seniorengerecht: grosse Touch-Targets, klare Farben, active:scale-95.
 */

interface SidebarButton {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
}

const buttons: SidebarButton[] = [
  {
    label: "Check-in",
    icon: Heart,
    bgColor: "bg-quartier-green",
    textColor: "text-white",
  },
  {
    label: "NOTRUF",
    icon: AlertTriangle,
    bgColor: "bg-emergency-red",
    textColor: "text-white",
  },
  {
    label: "Medikamente",
    icon: Pill,
    bgColor: "bg-info-blue",
    textColor: "text-white",
  },
  {
    label: "Sprechstunde",
    icon: Video,
    bgColor: "bg-anthrazit",
    textColor: "text-white",
  },
  {
    label: "News",
    icon: Newspaper,
    bgColor: "bg-anthrazit-light",
    textColor: "text-white",
  },
];

export default function TerminalSidebar() {
  return (
    <aside className="flex flex-col gap-2 w-[140px] shrink-0 bg-lightgray p-2">
      {buttons.map((btn) => {
        const Icon = btn.icon;
        return (
          <button
            key={btn.label}
            className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-xl ${btn.bgColor} ${btn.textColor} min-h-[100px] transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-quartier-green`}
            aria-label={btn.label}
          >
            <Icon className="h-8 w-8" />
            <span className="text-sm font-bold leading-tight text-center">
              {btn.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
