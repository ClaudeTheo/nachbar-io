"use client";

import { HelpTip } from "@/components/HelpTip";
import type { LampColor } from "@/lib/map-houses";

interface ColorCount {
  green: number;
  red: number;
  yellow: number;
  blue: number;
  orange: number;
}

interface MapControlsProps {
  counts: ColorCount;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onReset: () => void;
  quarterName: string;
}

const FILTER_ITEMS: { key: LampColor; label: string; color: string; bg: string }[] = [
  { key: "green", label: "Gruen", color: "#22c55e", bg: "#052e16" },
  { key: "red", label: "Rot", color: "#ef4444", bg: "#2d0505" },
  { key: "yellow", label: "Gelb", color: "#eab308", bg: "#2d2305" },
  { key: "blue", label: "Urlaub", color: "#3b82f6", bg: "#0c1e3d" },
  { key: "orange", label: "Paket", color: "#f97316", bg: "#2d1505" },
];

export function MapControls({ counts, activeFilter, onFilterChange, onReset, quarterName }: MapControlsProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg bg-[#111827] px-3 py-2">
      <div className="flex items-center gap-1.5">
        <div>
          <div className="text-sm font-bold text-[#f8fafc]">Nachbar.io — {quarterName}</div>
          <div className="text-xs text-[#64748b]">
            Klick auf ein Haus fuer Details · Hover fuer Adresse
          </div>
        </div>
        <HelpTip
          title="Farben auf der Karte"
          content="Gruen = Alles in Ordnung. Rot = Dringend. Gelb = Hinweis. Blau = Bewohner im Urlaub. Orange = Paketannahme."
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTER_ITEMS.map(({ key, label, color, bg }) => {
          const count = counts[key];
          if (count === 0 && (key === "blue" || key === "orange")) return null;
          return (
            <button
              key={key}
              onClick={() => onFilterChange(activeFilter === key ? "all" : key)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors"
              style={{
                background: activeFilter === key ? bg : "#1e293b",
                border: `1.5px solid ${activeFilter === key ? color : "#334155"}`,
                color: activeFilter === key ? color : "#94a3b8",
              }}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              {count} {label}
            </button>
          );
        })}
        <button
          onClick={onReset}
          className="cursor-pointer rounded-lg border border-[#334155] bg-[#1e293b] px-2.5 py-1 text-xs text-[#64748b] transition-colors hover:text-[#94a3b8]"
        >
          ↺ Reset
        </button>
      </div>
    </div>
  );
}
