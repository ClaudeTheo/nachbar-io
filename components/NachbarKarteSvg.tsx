"use client";

import { useState, useCallback, useMemo } from "react";
import {
  MAP_W,
  MAP_H,
  STREET_LABELS,
  COLOR_CFG,
  parseViewBox,
  type MapHouseData,
} from "@/lib/map-houses";
import { useQuarter } from "@/lib/quarters";
import { HouseInfoPanel } from "@/components/HouseInfoPanel";
import { MapFilterBar } from "@/components/MapFilterBar";
import { useMapStatuses } from "@/lib/hooks/useMapStatuses";
import { MAP_STATUS_META } from "@/lib/map-statuses";

interface NachbarKarteSvgProps {
  quarterId?: string;
}

export function NachbarKarteSvg({
  quarterId: quarterIdProp,
}: NachbarKarteSvgProps) {
  const { currentQuarter } = useQuarter();
  const quarterId = quarterIdProp ?? currentQuarter?.id;
  const mapConfig = currentQuarter?.map_config;

  // ViewBox und Hintergrundbild aus map_config (Fallback auf Pilot-Werte)
  const viewBox = mapConfig?.viewBox ?? `0 0 ${MAP_W} ${MAP_H}`;
  const backgroundImage = mapConfig?.backgroundImage ?? "/map-quartier.jpg";
  const { w: mapW, h: mapH } = useMemo(
    () => parseViewBox(mapConfig?.viewBox),
    [mapConfig?.viewBox],
  );

  const { houses, statuses, residentCounts } = useMapStatuses(
    quarterId,
    mapConfig,
    currentQuarter?.center_lat,
    currentQuarter?.center_lng,
  );

  const [hover, setHover] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [selectedHouse, setSelectedHouse] = useState<MapHouseData | null>(null);

  const click = useCallback((house: MapHouseData) => {
    setSelectedHouse(house);
  }, []);

  const occupiedIds = useMemo(
    () => new Set(houses.filter((house) => residentCounts[house.id] > 0).map((house) => house.id)),
    [houses, residentCounts],
  );

  const counts = useMemo(
    () => ({
      green: Object.entries(statuses).filter(([id, status]) => status === "green" && occupiedIds.has(id)).length,
      red: Object.entries(statuses).filter(([id, status]) => status === "red" && occupiedIds.has(id)).length,
      yellow: Object.entries(statuses).filter(([id, status]) => status === "yellow" && occupiedIds.has(id)).length,
      blue: Object.entries(statuses).filter(([id, status]) => status === "blue" && occupiedIds.has(id)).length,
      orange: Object.entries(statuses).filter(([id, status]) => status === "orange" && occupiedIds.has(id)).length,
    }),
    [statuses, occupiedIds],
  );

  const footerText = useMemo(
    () =>
      [
        `${occupiedIds.size} Nachbarn im Quartier`,
        counts.red > 0 ? `${counts.red} ${MAP_STATUS_META.red.chipLabel}` : null,
        counts.yellow > 0
          ? `${counts.yellow} ${MAP_STATUS_META.yellow.chipLabel}`
          : null,
        counts.blue > 0
          ? `${counts.blue} ${MAP_STATUS_META.blue.chipLabel}`
          : null,
        counts.orange > 0
          ? `${counts.orange} ${MAP_STATUS_META.orange.chipLabel}`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
    [counts, occupiedIds],
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-full" style={{ maxWidth: `${mapW}px` }}>
        <MapFilterBar
          counts={counts}
          filter={filter}
          onFilterChange={setFilter}
          onReset={() => setFilter("all")}
          quarterName={currentQuarter?.name ?? "Bad Säckingen"}
        />
      </div>

      {/* Karte */}
      <div
        className={`w-full max-w-[${mapW}px] overflow-hidden rounded-xl shadow-lg`}
        style={{
          boxShadow: "0 0 0 1px #1e293b, 0 4px 24px rgba(0,0,0,0.6)",
          maxWidth: `${mapW}px`,
        }}
      >
        <svg viewBox={viewBox} width="100%" className="block">
          <image
            href={backgroundImage}
            x={0}
            y={0}
            width={mapW}
            height={mapH}
            preserveAspectRatio="xMidYMid slice"
          />

          {/* Dimmer bei aktivem Filter */}
          {filter !== "all" && (
            <rect
              x={0}
              y={0}
              width={mapW}
              height={mapH}
              fill="rgba(0,0,0,0.35)"
              style={{ pointerEvents: "none" }}
            />
          )}

          {/* Lampen-Marker */}
          {houses.map((house) => {
            if (!residentCounts[house.id]) return null;

            const color = statuses[house.id];
            if (!color) return null;

            const cfg = COLOR_CFG[color];
            const isVisible = filter === "all" || color === filter;
            const isHovered = hover === house.id;
            const isSelected = selectedHouse?.id === house.id;

            if (!isVisible) return null;

            return (
              <g
                key={house.id}
                onClick={() => click(house)}
                onMouseEnter={() => setHover(house.id)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={house.x}
                  cy={house.y}
                  r={isHovered || isSelected ? 22 : 18}
                  fill={cfg.glow}
                  style={{ pointerEvents: "none" }}
                />

                {(isHovered || isSelected) && (
                  <circle
                    cx={house.x}
                    cy={house.y}
                    r={16}
                    fill="none"
                    stroke={
                      isSelected
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(255,255,255,0.4)"
                    }
                    strokeWidth={isSelected ? 2.5 : 2}
                  />
                )}

                <circle
                  cx={house.x}
                  cy={house.y}
                  r={12}
                  fill={cfg.fill}
                  stroke={cfg.ring}
                  strokeWidth={1.5}
                  style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.5))" }}
                />

                <circle
                  cx={house.x - 3}
                  cy={house.y - 3}
                  r={4}
                  fill="rgba(255,255,255,0.35)"
                  style={{ pointerEvents: "none" }}
                />

                <text
                  x={house.x}
                  y={house.y + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize={house.num.length > 2 ? "8" : "10"}
                  fontWeight="700"
                  fontFamily="'Segoe UI', sans-serif"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {house.num}
                </text>
              </g>
            );
          })}

          {/* Tooltip */}
          {hover &&
            (() => {
              const house = houses.find((candidate) => candidate.id === hover);
              if (!house) return null;

              const color = statuses[house.id];
              if (!color) return null;

              const cfg = COLOR_CFG[color];
              const streetName = STREET_LABELS[house.s] || house.s;
              const residentCount = residentCounts[house.id];
              const text = `${streetName} ${house.num}`;
              const subText = residentCount
                ? `${MAP_STATUS_META[color].statusLabel} · ${residentCount} Bewohner`
                : `${MAP_STATUS_META[color].statusLabel} · Klick für Details`;
              const tooltipWidth = Math.max(
                140,
                Math.max(text.length, subText.length) * 6.5 + 30,
              );
              const tooltipHeight = 40;
              const tooltipX = Math.min(
                Math.max(house.x - tooltipWidth / 2, 4),
                mapW - tooltipWidth - 4,
              );
              const tooltipY =
                house.y < 80 ? house.y + 14 : house.y - tooltipHeight - 12;

              return (
                <g style={{ pointerEvents: "none" }}>
                  <rect
                    x={tooltipX}
                    y={tooltipY}
                    width={tooltipWidth}
                    height={tooltipHeight}
                    rx={6}
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth={1}
                    opacity={0.96}
                  />
                  <circle
                    cx={tooltipX + 12}
                    cy={tooltipY + 13}
                    r={4.5}
                    fill={cfg.fill}
                  />
                  <text
                    x={tooltipX + 22}
                    y={tooltipY + 16}
                    fill="#f1f5f9"
                    fontSize="10.5"
                    fontWeight="700"
                    fontFamily="'Segoe UI', sans-serif"
                  >
                    {text}
                  </text>
                  <text
                    x={tooltipX + 22}
                    y={tooltipY + 31}
                    fill={cfg.fill}
                    fontSize="9"
                    fontFamily="'Segoe UI', sans-serif"
                  >
                    {subText}
                  </text>
                </g>
              );
            })()}
        </svg>
      </div>

      <div className="text-xs text-muted-foreground">{footerText}</div>

      {selectedHouse && (
        <HouseInfoPanel
          open={!!selectedHouse}
          onOpenChange={(open) => {
            if (!open) setSelectedHouse(null);
          }}
          streetCode={selectedHouse.s}
          houseNumber={selectedHouse.num}
        />
      )}
    </div>
  );
}
