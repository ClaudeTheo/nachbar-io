"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useQuarter } from "@/lib/quarters";
import { useUserRole } from "@/lib/quarters/hooks";
import { useMapStatuses } from "@/lib/hooks/useMapStatuses";
import { useSubscription } from "@/lib/care/hooks/useSubscription";
import { MapFilterBar } from "@/components/MapFilterBar";
import { HouseInfoPanel } from "@/components/HouseInfoPanel";
import type { GeoMapHouseData } from "@/lib/map-houses";
import { MAP_STATUS_META } from "@/lib/map-statuses";
import type { UserContext } from "@/lib/feature-flags";

// Leaflet muss client-side geladen werden (kein SSR)
const LeafletMapInner = dynamic(() => import("./LeafletMapInner"), {
  ssr: false,
});

interface LeafletKarteProps {
  quarterId?: string;
}

export function LeafletKarte({ quarterId: quarterIdProp }: LeafletKarteProps) {
  const { currentQuarter } = useQuarter();
  const { role } = useUserRole();
  const { subscription } = useSubscription();
  const quarterId = quarterIdProp ?? currentQuarter?.id;
  const mapConfig = currentQuarter?.map_config;

  const { geoHouses, statuses, residentCounts, loading } = useMapStatuses(
    quarterId,
    mapConfig,
    currentQuarter?.center_lat,
    currentQuarter?.center_lng,
  );

  const [filter, setFilter] = useState<string>("all");
  const [selectedHouse, setSelectedHouse] = useState<GeoMapHouseData | null>(
    null,
  );
  const userCtx: UserContext = useMemo(
    () => ({
      role,
      plan: subscription?.plan ?? "free",
      quarter_id: currentQuarter?.id,
    }),
    [currentQuarter?.id, role, subscription?.plan],
  );

  // Nur Haeuser mit registrierten Bewohnern zaehlen (per map_house_id)
  const occupiedIds = useMemo(
    () =>
      new Set(geoHouses.filter((h) => residentCounts[h.id]).map((h) => h.id)),
    [geoHouses, residentCounts],
  );

  const counts = useMemo(
    () => ({
      green: Object.entries(statuses).filter(
        ([id, s]) => s === "green" && occupiedIds.has(id),
      ).length,
      red: Object.entries(statuses).filter(
        ([id, s]) => s === "red" && occupiedIds.has(id),
      ).length,
      yellow: Object.entries(statuses).filter(
        ([id, s]) => s === "yellow" && occupiedIds.has(id),
      ).length,
      blue: Object.entries(statuses).filter(
        ([id, s]) => s === "blue" && occupiedIds.has(id),
      ).length,
      orange: Object.entries(statuses).filter(
        ([id, s]) => s === "orange" && occupiedIds.has(id),
      ).length,
    }),
    [statuses, occupiedIds],
  );

  const handleReset = useCallback(() => setFilter("all"), []);
  const handleHouseClick = useCallback(
    (house: GeoMapHouseData) => setSelectedHouse(house),
    [],
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

  // Sichtbare Häuser filtern
  const visibleHouses = useMemo(
    () =>
      geoHouses.filter((h) => {
        if (!residentCounts[h.id]) return false;
        const color = statuses[h.id];
        return filter === "all" || color === filter;
      }),
    [geoHouses, statuses, filter, residentCounts],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Karte wird geladen...
      </div>
    );
  }

  if (geoHouses.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
        Für dieses Quartier sind aktuell noch keine bestätigten
        Haushaltspositionen sichtbar.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      <MapFilterBar
        counts={counts}
        filter={filter}
        onFilterChange={setFilter}
        onReset={handleReset}
        quarterName={currentQuarter?.name ?? "Quartier"}
      />

      {/* Leaflet-Karte */}
      <div
        className="w-full overflow-hidden rounded-xl shadow-lg"
        style={{
          boxShadow: "0 0 0 1px #1e293b, 0 4px 24px rgba(0,0,0,0.6)",
          height: "clamp(400px, 62vh, 720px)",
        }}
      >
        <LeafletMapInner
          center={[
            currentQuarter?.center_lat ?? 47.567,
            currentQuarter?.center_lng ?? 8.064,
          ]}
          zoom={currentQuarter?.zoom_level ?? 17}
          tileUrl={
            mapConfig?.tileUrl ??
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          houses={visibleHouses}
          statuses={statuses}
          residentCounts={residentCounts}
          userCtx={userCtx}
          onHouseClick={handleHouseClick}
        />
      </div>

      {/* Fusszeile */}
      <div className="text-center text-xs text-muted-foreground">
        {footerText}
      </div>

      {/* Haus-Info Panel */}
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
