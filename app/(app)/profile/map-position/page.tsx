"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import {
  MAP_W, MAP_H, STREET_LABELS, STREET_CODE_TO_NAME, COLOR_CFG, DEFAULT_HOUSES,
  type MapHouseData, type LampColor, type StreetCode,
} from "@/lib/map-houses";
import { toast } from "sonner";

export default function MapPositionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const svgRef = useRef<SVGSVGElement>(null);
  const [houses, setHouses] = useState<MapHouseData[]>(DEFAULT_HOUSES);
  const [myHouse, setMyHouse] = useState<MapHouseData | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  // Haushalt-Info fuer Create-Fall
  const [householdInfo, setHouseholdInfo] = useState<{
    householdId: string;
    streetName: string;
    houseNumber: string;
    streetCode: StreetCode;
  } | null>(null);
  const [isNewEntry, setIsNewEntry] = useState(false);

  useEffect(() => {
    async function init() {
      if (!user) return;
      const supabase = createClient();

      // Haeuser laden
      const { data: mapData } = await supabase
        .from("map_houses")
        .select("id, house_number, street_code, x, y, default_color")
        .order("street_code");

      const loadedHouses: MapHouseData[] = (mapData && mapData.length > 0)
        ? mapData.map(h => ({
            id: h.id,
            num: h.house_number,
            s: h.street_code as StreetCode,
            x: h.x,
            y: h.y,
            defaultColor: h.default_color as LampColor,
          }))
        : DEFAULT_HOUSES;

      setHouses(loadedHouses);

      // Eigenen Haushalt finden
      const { data: membership } = await supabase
        .from("household_members")
        .select("household_id, households(street_name, house_number)")
        .eq("user_id", user.id)
        .not("verified_at", "is", null)
        .limit(1)
        .maybeSingle();

      if (membership) {
        const hh = membership.households as unknown as { street_name: string; house_number: string } | null;
        if (hh) {
          const code = (Object.entries(STREET_CODE_TO_NAME) as [StreetCode, string][])
            .find(([, name]) => name === hh.street_name)?.[0];

          if (code) {
            setHouseholdInfo({
              householdId: membership.household_id,
              streetName: hh.street_name,
              houseNumber: hh.house_number,
              streetCode: code,
            });

            // Suche bestehendes Haus auf der Karte
            const found = loadedHouses.find(h => h.s === code && h.num === hh.house_number);
            if (found) {
              // Bestehender Eintrag — Update-Modus
              setMyHouse(found);
              setPosition({ x: found.x, y: found.y });
            } else {
              // Kein Eintrag — Create-Modus (Punkt in der Mitte)
              setIsNewEntry(true);
              const newHouse: MapHouseData = {
                id: `${code.toLowerCase()}${hh.house_number}`,
                num: hh.house_number,
                s: code,
                x: Math.round(MAP_W / 2),
                y: Math.round(MAP_H / 2),
                defaultColor: "green",
              };
              setMyHouse(newHouse);
              setPosition({ x: newHouse.x, y: newHouse.y });
              setHasChanged(true); // Sofort als geaendert markieren
            }
          }
        }
      }

      setLoading(false);
    }
    init();
  }, [user]);

  // SVG-Koordinaten aus Mouse/Touch-Event berechnen
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
    if (!myHouse) return;
    e.preventDefault();
    setDragging(true);
    (e.target as SVGElement).setPointerCapture(e.pointerId);
  }, [myHouse]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const coords = toSvgCoords(e.clientX, e.clientY);
    if (coords) {
      setPosition(coords);
      setHasChanged(true);
    }
  }, [dragging, toSvgCoords]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  async function handleSave() {
    if (!myHouse || !position || !hasChanged || !householdInfo) return;
    setSaving(true);

    const supabase = createClient();

    if (isNewEntry) {
      // Neuen Eintrag erstellen
      const { error } = await supabase
        .from("map_houses")
        .upsert({
          id: myHouse.id,
          house_number: householdInfo.houseNumber,
          street_code: householdInfo.streetCode,
          x: position.x,
          y: position.y,
          default_color: "green",
          household_id: householdInfo.householdId,
        }, { onConflict: "id" });

      if (error) {
        toast.error("Position konnte nicht gespeichert werden.");
      } else {
        toast.success("Position gespeichert!");
        setHasChanged(false);
        setIsNewEntry(false);
      }
    } else {
      // Bestehenden Eintrag aktualisieren
      const { error } = await supabase
        .from("map_houses")
        .update({ x: position.x, y: position.y })
        .eq("id", myHouse.id);

      if (error) {
        toast.error("Position konnte nicht gespeichert werden.");
      } else {
        toast.success("Position gespeichert!");
        setHasChanged(false);
      }
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="animate-fade-in-up">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push("/profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-anthrazit">Kartenposition</h1>
          <p className="text-sm text-muted-foreground">
            {isNewEntry
              ? "Setzen Sie die Position Ihres Hauses auf der Karte"
              : "Passen Sie die Position Ihres Hauses auf der Karte an"
            }
          </p>
        </div>
      </div>

      {!myHouse ? (
        <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
          <p className="mt-2 text-sm text-muted-foreground">
            Kein Haushalt zugeordnet. Bitte melden Sie sich zuerst an.
          </p>
        </div>
      ) : (
        <>
          {/* Info */}
          <div className="mb-3 rounded-lg border border-quartier-green/20 bg-quartier-green/5 p-3">
            <p className="text-sm text-quartier-green">
              <strong>{STREET_LABELS[myHouse.s]} {myHouse.num}</strong> — Ziehen Sie den
              grünen Punkt an die richtige Position.
            </p>
          </div>

          {/* Mini-Karte */}
          <div className="overflow-hidden rounded-xl border border-border shadow-md">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              width="100%"
              className="block touch-none"
            >
              <image href="/map-quartier.jpg" x={0} y={0} width={MAP_W} height={MAP_H} preserveAspectRatio="xMidYMid slice" />

              {/* Alle Haeuser (gedimmt) */}
              {houses.map((h) => {
                if (h.id === myHouse.id) return null;
                return (
                  <circle
                    key={h.id}
                    cx={h.x} cy={h.y} r={8}
                    fill="rgba(100,116,139,0.5)"
                    stroke="rgba(100,116,139,0.3)"
                    strokeWidth={1}
                    style={{ pointerEvents: "none" }}
                  />
                );
              })}

              {/* Eigenes Haus (draggbar) */}
              {position && (
                <g
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  style={{ cursor: dragging ? "grabbing" : "grab" }}
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

                  {/* Hausnummer */}
                  <text
                    x={position.x} y={position.y + 4}
                    textAnchor="middle"
                    fill="white"
                    fontSize={myHouse.num.length > 2 ? "8" : "10"}
                    fontWeight="700"
                    fontFamily="'Segoe UI', sans-serif"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {myHouse.num}
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Koordinaten-Anzeige */}
          {position && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Position: {position.x}, {position.y}
              {hasChanged && " (geändert)"}
            </p>
          )}

          {/* Speichern-Button */}
          <div className="mt-3 flex justify-end">
            <Button
              disabled={!hasChanged || saving}
              onClick={handleSave}
              className="gap-2 bg-quartier-green hover:bg-quartier-green/90"
            >
              <Save className="h-4 w-4" />
              {saving ? "Speichern..." : "Position speichern"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
