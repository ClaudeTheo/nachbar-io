"use client";

// SVG-Kartenflaeche mit Haus-Markern, Drag & Drop, Neues-Haus-Vorschau

import React, { useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { COLOR_CFG } from "@/lib/map-houses";
import type { MapHouseData, DragState, NewHouseForm } from "./types";

interface MapSvgCanvasProps {
  /** ViewBox-String fuer SVG */
  viewBoxStr: string;
  /** Hintergrundbild-URL */
  backgroundImage: string;
  /** Kartenbreite (aus viewBox) */
  mapW: number;
  /** Kartenhoehe (aus viewBox) */
  mapH: number;
  /** Alle Haus-Daten */
  houses: MapHouseData[];
  /** Aktuell ausgewaehlte Haus-ID */
  selectedId: string | null;
  /** Ob der Hinzufuegen-Modus aktiv ist */
  isAddMode: boolean;
  /** Aktueller Drag-State */
  dragState: DragState | null;
  /** Neues-Haus Vorschau-Daten */
  newHouse: NewHouseForm | null;
  /** Callback: Haus-Marker angeklickt (Drag-Start) */
  onPointerDown: (e: React.PointerEvent, houseId: string) => void;
  /** Callback: Mausbewegung (Drag) */
  onPointerMove: (e: React.PointerEvent) => void;
  /** Callback: Drag beendet */
  onPointerUp: (e: React.PointerEvent) => void;
  /** Callback: Klick auf leere Kartenflaeche */
  onSvgClick: (e: React.MouseEvent<SVGSVGElement>) => void;
  /** Ref-Setter fuer SVG-Element (fuer Koordinatenberechnung) */
  svgRefCallback: (el: SVGSVGElement | null) => void;
}

export function MapSvgCanvas({
  viewBoxStr,
  backgroundImage,
  mapW,
  mapH,
  houses,
  selectedId,
  isAddMode,
  dragState,
  newHouse,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onSvgClick,
  svgRefCallback,
}: MapSvgCanvasProps) {
  // Lokaler Ref fuer SVG (wird auch nach oben weitergegeben)
  const localRef = useRef<SVGSVGElement | null>(null);

  const setRef = useCallback(
    (el: SVGSVGElement | null) => {
      localRef.current = el;
      svgRefCallback(el);
    },
    [svgRefCallback],
  );

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <svg
          ref={setRef}
          viewBox={viewBoxStr}
          width="100%"
          className="block"
          style={{ cursor: isAddMode ? "crosshair" : "default", touchAction: "none" }}
          onClick={onSvgClick}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <image href={backgroundImage} x={0} y={0} width={mapW} height={mapH} preserveAspectRatio="xMidYMid slice" />

          {/* Haus-Marker */}
          {houses.map((h) => {
            const cfg = COLOR_CFG[h.defaultColor];
            const isSelected = selectedId === h.id;
            const isDragging = dragState?.houseId === h.id;

            return (
              <g
                key={h.id}
                style={{ cursor: isDragging ? "grabbing" : "grab" }}
                onPointerDown={(e) => onPointerDown(e, h.id)}
              >
                {/* Glow */}
                <circle cx={h.x} cy={h.y} r={isSelected ? 24 : 18} fill={cfg.glow} style={{ pointerEvents: "none" }} />

                {/* Auswahl-Ring */}
                {isSelected && (
                  <circle cx={h.x} cy={h.y} r={18} fill="none" stroke="white" strokeWidth={2.5} strokeDasharray="4 3" />
                )}

                {/* Lampen-Punkt */}
                <circle
                  cx={h.x} cy={h.y} r={12}
                  fill={cfg.fill} stroke={cfg.ring} strokeWidth={1.5}
                  style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.5))" }}
                />

                {/* Glanzpunkt */}
                <circle cx={h.x - 3} cy={h.y - 3} r={4} fill="rgba(255,255,255,0.35)" style={{ pointerEvents: "none" }} />

                {/* Hausnummer */}
                <text
                  x={h.x} y={h.y + 4}
                  textAnchor="middle" fill="white"
                  fontSize={h.num.length > 2 ? "8" : "10"}
                  fontWeight="700" fontFamily="'Segoe UI', sans-serif"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {h.num}
                </text>

                {/* Drag-Indikator bei Auswahl */}
                {isSelected && !isDragging && (
                  <text
                    x={h.x} y={h.y - 20}
                    textAnchor="middle" fill="white"
                    fontSize="8" fontFamily="'Segoe UI', sans-serif"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    ⇄ Ziehen
                  </text>
                )}
              </g>
            );
          })}

          {/* Neues-Haus Vorschau */}
          {newHouse && (
            <g style={{ pointerEvents: "none" }}>
              <circle cx={newHouse.x} cy={newHouse.y} r={20} fill="rgba(76,175,135,0.3)" />
              <circle cx={newHouse.x} cy={newHouse.y} r={12} fill="#4CAF87" stroke="#2D3142" strokeWidth={2} strokeDasharray="4 3" />
              <text
                x={newHouse.x} y={newHouse.y - 18}
                textAnchor="middle" fill="white" fontSize="10" fontWeight="700"
                fontFamily="'Segoe UI', sans-serif"
              >
                Neues Haus
              </text>
            </g>
          )}
        </svg>
      </div>
    </Card>
  );
}
