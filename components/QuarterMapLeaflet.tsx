"use client";

import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@/components/quarter-map/map-styles.css";
import { createClient } from "@/lib/supabase/client";
import {
  STREET_CODE_TO_NAME, DEFAULT_HOUSES,
  type MapHouseData, type GeoMapHouseData, type LampColor, type StreetCode,
} from "@/lib/map-houses";
import { HouseInfoPanel } from "@/components/HouseInfoPanel";
import { MapMarker } from "@/components/quarter-map/MapMarker";
import { MapControls } from "@/components/quarter-map/MapControls";
import { BuildingOverlay } from "@/components/quarter-map/BuildingOverlay";

// Default-Quartier (Bad Saeckingen Pilot)
const DEFAULT_CENTER: [number, number] = [47.5535, 7.9640];
const DEFAULT_ZOOM = 17;
const DEFAULT_BOUNDS = { swLat: 47.5500, swLng: 7.9580, neLat: 47.5570, neLng: 7.9710 };

export function QuarterMapLeaflet() {
  const [houses, setHouses] = useState<MapHouseData[]>(DEFAULT_HOUSES);
  const [geoData, setGeoData] = useState<Record<string, { lat: number; lng: number }>>({});
  const [statuses, setStatuses] = useState<Record<string, LampColor>>(() => {
    const s: Record<string, LampColor> = {};
    DEFAULT_HOUSES.forEach((h) => { s[h.id] = h.defaultColor; });
    return s;
  });
  const [filter, setFilter] = useState<string>("all");
  const [selectedHouse, setSelectedHouse] = useState<MapHouseData | null>(null);
  const [residentCounts, setResidentCounts] = useState<Record<string, number>>({});
  const [quarterName, setQuarterName] = useState("Bad Saeckingen");
  const [bounds, setBounds] = useState(DEFAULT_BOUNDS);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // Daten von Supabase laden (identische Logik wie NachbarKarte)
  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();

        // Quartier laden
        const { data: quarterData } = await supabase
          .from("quarters")
          .select("*")
          .limit(1)
          .single();

        if (quarterData) {
          setQuarterName(quarterData.name);
          setCenter([quarterData.center_lat, quarterData.center_lng]);
          setZoom(quarterData.zoom_level);
          setBounds({
            swLat: quarterData.bounds_sw_lat,
            swLng: quarterData.bounds_sw_lng,
            neLat: quarterData.bounds_ne_lat,
            neLng: quarterData.bounds_ne_lng,
          });
        }

        // Haeuser laden (mit Geo-Koordinaten)
        const { data, error } = await supabase
          .from("map_houses")
          .select("id, house_number, street_code, x, y, default_color, lat, lng")
          .order("street_code");

        let loadedHouses = DEFAULT_HOUSES;
        if (!error && data && data.length > 0) {
          loadedHouses = data.map(h => ({
            id: h.id,
            num: h.house_number,
            s: h.street_code as MapHouseData["s"],
            x: h.x,
            y: h.y,
            defaultColor: h.default_color as LampColor,
          }));
          setHouses(loadedHouses);

          // Geo-Daten separat speichern
          const geo: Record<string, { lat: number; lng: number }> = {};
          for (const h of data) {
            if (h.lat != null && h.lng != null) {
              geo[h.id] = { lat: h.lat, lng: h.lng };
            }
          }
          setGeoData(geo);

          setStatuses(prev => {
            const s: Record<string, LampColor> = {};
            loadedHouses.forEach((h) => { s[h.id] = prev[h.id] ?? h.defaultColor; });
            return s;
          });
        }

        // Aktive Urlaube laden — Haeuser blau faerben
        const today = new Date().toISOString().split("T")[0];
        const { data: vacations } = await supabase
          .from("vacation_modes")
          .select("user_id")
          .lte("start_date", today)
          .gte("end_date", today);

        if (vacations && vacations.length > 0) {
          const vacUserIds = vacations.map(v => v.user_id);
          const { data: members } = await supabase
            .from("household_members")
            .select("household_id, user_id, households(street_name, house_number)")
            .in("user_id", vacUserIds)
            .not("verified_at", "is", null);

          if (members) {
            const vacHouseKeys: Record<string, boolean> = {};
            for (const m of members) {
              const hh = m.households as unknown as { street_name: string; house_number: string } | null;
              if (hh) {
                const code = (Object.entries(STREET_CODE_TO_NAME) as [StreetCode, string][])
                  .find(([, name]) => name === hh.street_name)?.[0];
                if (code) vacHouseKeys[`${code}:${hh.house_number}`] = true;
              }
            }

            setStatuses(prev => {
              const updated = { ...prev };
              for (const h of loadedHouses) {
                if (vacHouseKeys[`${h.s}:${h.num}`]) updated[h.id] = "blue";
              }
              return updated;
            });
          }
        }

        // Aktive Paketannahmen laden — Haeuser orange faerben
        const { data: packages } = await supabase
          .from("paketannahme")
          .select("user_id")
          .eq("available_date", today);

        if (packages && packages.length > 0) {
          const pkgUserIds = packages.map(p => p.user_id);
          const { data: pkgMembers } = await supabase
            .from("household_members")
            .select("household_id, user_id, households(street_name, house_number)")
            .in("user_id", pkgUserIds)
            .not("verified_at", "is", null);

          if (pkgMembers) {
            const pkgHouseKeys: Record<string, boolean> = {};
            for (const m of pkgMembers) {
              const hh = m.households as unknown as { street_name: string; house_number: string } | null;
              if (hh) {
                const code = (Object.entries(STREET_CODE_TO_NAME) as [StreetCode, string][])
                  .find(([, name]) => name === hh.street_name)?.[0];
                if (code) pkgHouseKeys[`${code}:${hh.house_number}`] = true;
              }
            }

            setStatuses(prev => {
              const updated = { ...prev };
              for (const h of loadedHouses) {
                if (pkgHouseKeys[`${h.s}:${h.num}`] && updated[h.id] !== "blue") {
                  updated[h.id] = "orange";
                }
              }
              return updated;
            });
          }
        }

        // Bewohnerzahlen laden
        const { data: countData } = await supabase
          .from("household_members")
          .select("household_id, households(street_name, house_number)")
          .not("verified_at", "is", null);

        if (countData) {
          const counts: Record<string, number> = {};
          for (const m of countData) {
            const hh = m.households as unknown as { street_name: string; house_number: string } | null;
            if (hh) {
              const code = (Object.entries(STREET_CODE_TO_NAME) as [StreetCode, string][])
                .find(([, name]) => name === hh.street_name)?.[0];
              if (code) {
                const key = `${code}:${hh.house_number}`;
                counts[key] = (counts[key] ?? 0) + 1;
              }
            }
          }
          setResidentCounts(counts);
        }
      } catch {
        // Fallback — nichts zu tun
      }
    }
    loadData();
  }, []);

  const handleClick = useCallback((h: MapHouseData) => {
    setSelectedHouse(h);
  }, []);

  const handleReset = useCallback(() => {
    const s: Record<string, LampColor> = {};
    houses.forEach((h) => { s[h.id] = h.defaultColor; });
    setStatuses(s);
    setFilter("all");
  }, [houses]);

  // Nur Haeuser mit registrierten Bewohnern zaehlen
  const occupiedIds = new Set(
    houses.filter((h) => residentCounts[`${h.s}:${h.num}`]).map((h) => h.id),
  );
  const counts = {
    green: Object.entries(statuses).filter(([id, s]) => s === "green" && occupiedIds.has(id)).length,
    red: Object.entries(statuses).filter(([id, s]) => s === "red" && occupiedIds.has(id)).length,
    yellow: Object.entries(statuses).filter(([id, s]) => s === "yellow" && occupiedIds.has(id)).length,
    blue: Object.entries(statuses).filter(([id, s]) => s === "blue" && occupiedIds.has(id)).length,
    orange: Object.entries(statuses).filter(([id, s]) => s === "orange" && occupiedIds.has(id)).length,
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Steuerleiste */}
      <MapControls
        counts={counts}
        activeFilter={filter}
        onFilterChange={setFilter}
        onReset={handleReset}
        quarterName={quarterName}
      />

      {/* Leaflet-Karte */}
      <div
        className="w-full overflow-hidden rounded-xl shadow-lg"
        style={{ boxShadow: "0 0 0 1px #1e293b, 0 4px 24px rgba(0,0,0,0.6)" }}
      >
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: "500px", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Gebaeude-Umrisse aus OSM */}
          <BuildingOverlay bounds={bounds} />

          {/* Haus-Marker */}
          {houses.map((h) => {
            const houseKey = `${h.s}:${h.num}`;
            if (!residentCounts[houseKey]) return null;

            const color = statuses[h.id];
            if (!color) return null;

            const geo = geoData[h.id];
            if (!geo) return null; // Kein Geo-Daten — Marker nicht anzeigen

            const dimmed = filter !== "all" && color !== filter;

            return (
              <MapMarker
                key={h.id}
                lat={geo.lat}
                lng={geo.lng}
                houseNumber={h.num}
                streetCode={h.s}
                color={color}
                residentCount={residentCounts[houseKey] ?? 0}
                dimmed={dimmed}
                onClick={() => handleClick(h)}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* Fusszeile */}
      <div className="text-xs text-muted-foreground">
        {Object.values(residentCounts).filter(c => c > 0).length} Nachbarn im Quartier
        {counts.blue > 0 && ` · ${counts.blue} Urlaub`}
        {counts.orange > 0 && ` · ${counts.orange} Paket`}
      </div>

      {/* Haus-Info Panel */}
      {selectedHouse && (
        <HouseInfoPanel
          open={!!selectedHouse}
          onOpenChange={(open) => { if (!open) setSelectedHouse(null); }}
          streetCode={selectedHouse.s}
          houseNumber={selectedHouse.num}
        />
      )}
    </div>
  );
}
