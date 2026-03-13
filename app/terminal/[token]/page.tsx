"use client";

import {
  Home,
  Bell,
  Pill,
  Newspaper,
  CalendarDays,
  Video,
} from "lucide-react";

/**
 * Terminal-Dashboard: 6 Kacheln in einem 2x3-Grid.
 * Seniorengerecht: grosse Kacheln, klare Farben, Touch-Feedback.
 */

interface DashboardTile {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
}

const tiles: DashboardTile[] = [
  {
    title: "Willkommen",
    subtitle: "Guten Tag!",
    icon: Home,
    bgColor: "bg-quartier-green",
    textColor: "text-white",
  },
  {
    title: "Meldungen",
    subtitle: "Keine neuen",
    icon: Bell,
    bgColor: "bg-alert-amber",
    textColor: "text-anthrazit",
  },
  {
    title: "Medikamente",
    subtitle: "Alles eingenommen",
    icon: Pill,
    bgColor: "bg-info-blue",
    textColor: "text-white",
  },
  {
    title: "Neuigkeiten",
    subtitle: "3 neue Artikel",
    icon: Newspaper,
    bgColor: "bg-anthrazit",
    textColor: "text-white",
  },
  {
    title: "Termine",
    subtitle: "Heute keine",
    icon: CalendarDays,
    bgColor: "bg-quartier-green-dark",
    textColor: "text-white",
  },
  {
    title: "Sprechstunde",
    subtitle: "Naechste: 15:00",
    icon: Video,
    bgColor: "bg-anthrazit-light",
    textColor: "text-white",
  },
];

export default function TerminalDashboard() {
  return (
    <div className="grid grid-cols-2 grid-rows-3 gap-4 h-full">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <button
            key={tile.title}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl ${tile.bgColor} ${tile.textColor} shadow-soft transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-quartier-green`}
          >
            <Icon className="h-12 w-12" />
            <span className="text-2xl font-bold">{tile.title}</span>
            <span className="text-lg opacity-80">{tile.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}
