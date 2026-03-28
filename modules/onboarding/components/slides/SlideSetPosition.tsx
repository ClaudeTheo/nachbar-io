"use client";

import { useCallback, useRef } from "react";
import { MapPin } from "lucide-react";
import { MAP_W, MAP_H, COLOR_CFG } from "@/lib/map-houses";

interface Props {
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
}

export function SlideSetPosition({ position, onPositionChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);

  // SVG-Koordinaten aus Pointer-Event berechnen
  const toSvgCoords = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.round(((clientX - rect.left) / rect.width) * MAP_W);
    const y = Math.round(((clientY - rect.top) / rect.height) * MAP_H);
    return {
      x: Math.max(10, Math.min(MAP_W - 10, x)),
      y: Math.max(10, Math.min(MAP_H - 10, y)),
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    (e.target as SVGElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const coords = toSvgCoords(e.clientX, e.clientY);
    if (coords) onPositionChange(coords);
  }, [toSvgCoords, onPositionChange]);

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  // Klick auf die Karte = Position direkt setzen
  const handleMapClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingRef.current) return;
    const coords = toSvgCoords(e.clientX, e.clientY);
    if (coords) onPositionChange(coords);
  }, [toSvgCoords, onPositionChange]);

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      {/* Titel */}
      <div className="mb-4 flex items-center gap-2">
        <MapPin className="h-6 w-6 text-quartier-green" />
        <h2 className="text-xl font-bold text-anthrazit">Wo wohnen Sie?</h2>
      </div>

      <p className="mb-4 text-center text-sm text-muted-foreground">
        Tippen oder ziehen Sie den grünen Punkt auf Ihr Haus.
      </p>

      {/* Karte */}
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-border shadow-md">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          width="100%"
          className="block touch-none"
          onClick={handleMapClick}
        >
          <image
            href="/map-quartier.jpg"
            x={0} y={0}
            width={MAP_W} height={MAP_H}
            preserveAspectRatio="xMidYMid slice"
          />

          {/* Draggbarer Punkt */}
          <g
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ cursor: "grab" }}
          >
            {/* Pulsierender Ring */}
            <circle cx={position.x} cy={position.y} r={24} fill="rgba(34,197,94,0.2)" style={{ pointerEvents: "none" }}>
              <animate attributeName="r" values="20;28;20" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Glow */}
            <circle cx={position.x} cy={position.y} r={20} fill={COLOR_CFG.green.glow} style={{ pointerEvents: "none" }} />

            {/* Haupt-Punkt */}
            <circle
              cx={position.x} cy={position.y} r={14}
              fill={COLOR_CFG.green.fill}
              stroke="white"
              strokeWidth={2.5}
              style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))" }}
            />

            {/* Pin-Icon (Pfeil nach unten) */}
            <text
              x={position.x} y={position.y + 5}
              textAnchor="middle"
              fill="white"
              fontSize="14"
              fontWeight="700"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              ⌂
            </text>
          </g>
        </svg>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Position: {position.x}, {position.y}
      </p>
    </div>
  );
}
