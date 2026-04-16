"use client";

import { HelpTip } from "@/components/HelpTip";
import type { LampColor } from "@/lib/map-houses";
import { MAP_STATUS_HELP_TEXT, MAP_STATUS_META } from "@/lib/map-statuses";

// Farb-Filter-Konfiguration für die Kartensteuerleiste
const FILTER_ITEMS: { key: LampColor; label: string; color: string; bg: string }[] = [
  { key: "green", label: MAP_STATUS_META.green.chipLabel, color: "#22c55e", bg: "#052e16" },
  { key: "red", label: MAP_STATUS_META.red.chipLabel, color: "#ef4444", bg: "#2d0505" },
  { key: "yellow", label: MAP_STATUS_META.yellow.chipLabel, color: "#eab308", bg: "#2d2305" },
  { key: "blue", label: MAP_STATUS_META.blue.chipLabel, color: "#3b82f6", bg: "#0c1e3d" },
  { key: "orange", label: MAP_STATUS_META.orange.chipLabel, color: "#f97316", bg: "#2d1505" },
];

interface FilterCounts {
  green: number;
  red: number;
  yellow: number;
  blue: number;
  orange: number;
}

interface MapFilterBarProps {
  counts: FilterCounts;
  filter: string;
  onFilterChange: (filter: string) => void;
  onReset: () => void;
  quarterName: string;
}

// Gemeinsame Steuerleiste für SVG- und Leaflet-Karten
export function MapFilterBar({ counts, filter, onFilterChange, onReset, quarterName }: MapFilterBarProps) {
  return (
    <div className="w-full rounded-xl bg-[#111827] px-3 py-3 sm:px-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold leading-tight text-[#f8fafc] sm:text-sm">
            QuartierApp — {quarterName}
          </div>
          <div className="mt-1 text-xs leading-snug text-[#94a3b8]">
            <span className="sm:hidden">Tippe auf ein Haus für Details</span>
            <span className="hidden sm:inline">
              Klick auf ein Haus für Details · Hover für Adresse
            </span>
          </div>
        </div>
        <HelpTip
          title="Farben auf der Karte"
          content={MAP_STATUS_HELP_TEXT}
        />
      </div>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:mt-2.5 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {FILTER_ITEMS.map(({ key, label, color, bg }) => {
          const count = counts[key] ?? 0;
          // Urlaub und Paket nur anzeigen wenn count > 0
          if (count === 0 && (key === "blue" || key === "orange")) return null;
          return (
            <button
              type="button"
              key={key}
              onClick={() => onFilterChange(filter === key ? "all" : key)}
              aria-pressed={filter === key}
              aria-label={`${label} filtern, ${count} Häuser`}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: filter === key ? bg : "#1e293b",
                border: `1.5px solid ${filter === key ? color : "#334155"}`,
                color: filter === key ? color : "#94a3b8",
              }}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: color }}
              />
              {count} {label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-[#334155] bg-[#1e293b] px-3 py-1.5 text-xs text-[#94a3b8] transition-colors hover:text-[#cbd5e1]"
        >
          ↺ Reset
        </button>
      </div>
    </div>
  );
}
