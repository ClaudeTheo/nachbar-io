"use client";

import { Heart, AlertTriangle, Pill, Video, Newspaper } from "lucide-react";
import { useTerminal, type TerminalScreen } from "@/lib/terminal/TerminalContext";

/**
 * Terminal-Sidebar: 5 Aktions-Buttons, immer sichtbar.
 * Jeder Button fuellt die gleiche Hoehe (flex-1).
 * Seniorengerecht: grosse Touch-Targets, klare Farben, active:scale-95.
 * Aktiver Button wird mit hellem Ring hervorgehoben.
 */

interface SidebarButton {
  label: string;
  screen: TerminalScreen;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
}

const buttons: SidebarButton[] = [
  {
    label: "Check-in",
    screen: "checkin",
    icon: Heart,
    bgColor: "bg-quartier-green",
    textColor: "text-white",
  },
  {
    label: "NOTRUF",
    screen: "emergency",
    icon: AlertTriangle,
    bgColor: "bg-emergency-red",
    textColor: "text-white",
  },
  {
    label: "Medikamente",
    screen: "medications",
    icon: Pill,
    bgColor: "bg-info-blue",
    textColor: "text-white",
  },
  {
    label: "Sprechstunde",
    screen: "video",
    icon: Video,
    bgColor: "bg-anthrazit",
    textColor: "text-white",
  },
  {
    label: "News",
    screen: "news",
    icon: Newspaper,
    bgColor: "bg-anthrazit-light",
    textColor: "text-white",
  },
];

export default function TerminalSidebar() {
  const { activeScreen, setActiveScreen } = useTerminal();

  return (
    <aside className="flex flex-col gap-2 w-[140px] shrink-0 bg-lightgray p-2">
      {buttons.map((btn) => {
        const Icon = btn.icon;
        const isActive = activeScreen === btn.screen;

        return (
          <button
            key={btn.label}
            onClick={() => setActiveScreen(btn.screen)}
            className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-xl ${btn.bgColor} ${btn.textColor} min-h-[100px] transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-quartier-green ${
              isActive
                ? "ring-3 ring-white brightness-110 scale-[1.02]"
                : ""
            }`}
            aria-label={btn.label}
            aria-pressed={isActive}
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
