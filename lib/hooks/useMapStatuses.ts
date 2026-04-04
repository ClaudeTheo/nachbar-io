// Wiederverwendbarer Hook fuer Karten-Status-Logik
// Extrahiert aus NachbarKarte.tsx — wird von SVG-Karte und Leaflet-Karte genutzt

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_HOUSES,
  loadQuarterHouses,
  loadGeoQuarterHouses,
  isGeoQuarter,
  type MapHouseData,
  type GeoMapHouseData,
  type LampColor,
} from "@/lib/map-houses";
import type { MapConfig } from "@/lib/quarters/types";

export interface MapStatusResult {
  houses: MapHouseData[];
  geoHouses: GeoMapHouseData[];
  statuses: Record<string, LampColor>;
  residentCounts: Record<string, number>;
  loading: boolean;
}

/**
 * Lädt Häuser, Urlaubsstatus (blau), Paketannahme (orange) und Bewohnerzahlen.
 * Unterstützt sowohl SVG- als auch Leaflet-Quartiere (via mapConfig.type).
 */
export function useMapStatuses(quarterId?: string, mapConfig?: MapConfig): MapStatusResult {
  const [houses, setHouses] = useState<MapHouseData[]>(DEFAULT_HOUSES);
  const [geoHouses, setGeoHouses] = useState<GeoMapHouseData[]>([]);
  const [statuses, setStatuses] = useState<Record<string, LampColor>>(() => {
    const s: Record<string, LampColor> = {};
    DEFAULT_HOUSES.forEach((h) => { s[h.id] = h.defaultColor; });
    return s;
  });
  const [residentCounts, setResidentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const supabase = createClient();
        const useGeo = isGeoQuarter(mapConfig);

        // Häuser für aktuelles Quartier laden (SVG oder Geo)
        let loadedHouses: MapHouseData[] = DEFAULT_HOUSES;
        let loadedGeoHouses: GeoMapHouseData[] = [];

        if (quarterId) {
          if (useGeo) {
            const geo = await loadGeoQuarterHouses(quarterId);
            if (geo.length > 0) {
              loadedGeoHouses = geo;
              // Geo-Häuser auch als normale Häuser bereitstellen (für Status-Logik)
              loadedHouses = geo;
            }
          } else {
            const quarterHouses = await loadQuarterHouses(quarterId);
            if (quarterHouses.length > 0) {
              loadedHouses = quarterHouses;
            }
          }
        }

        setHouses(loadedHouses);
        setGeoHouses(loadedGeoHouses);
        setStatuses(() => {
          const s: Record<string, LampColor> = {};
          loadedHouses.forEach((h) => { s[h.id] = h.defaultColor; });
          return s;
        });

        // Skalierbare Zuordnung: household → map_house_id (kein statisches Street-Code-Mapping)
        const houseIds = loadedHouses.map(h => h.id);

        // Haushalte fuer die Haeuser dieses Quartiers laden
        const { data: hhData } = await supabase
          .from("households")
          .select("id, map_house_id")
          .in("map_house_id", houseIds.length > 0 ? houseIds : ["__none__"]);

        // Mapping: household_id → map_house_id
        const hhToMapHouse = new Map<string, string>();
        const hhIds: string[] = [];
        if (hhData) {
          for (const h of hhData) {
            if (h.map_house_id) {
              hhToMapHouse.set(h.id, h.map_house_id);
              hhIds.push(h.id);
            }
          }
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
            .select("household_id")
            .in("user_id", vacUserIds)
            .in("household_id", hhIds.length > 0 ? hhIds : ["__none__"])
            .not("verified_at", "is", null);

          if (members) {
            const vacHouseIds = new Set<string>();
            for (const m of members) {
              const mapId = hhToMapHouse.get(m.household_id);
              if (mapId) vacHouseIds.add(mapId);
            }
            setStatuses(prev => {
              const updated = { ...prev };
              for (const h of loadedHouses) {
                if (vacHouseIds.has(h.id)) updated[h.id] = "blue";
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
            .select("household_id")
            .in("user_id", pkgUserIds)
            .in("household_id", hhIds.length > 0 ? hhIds : ["__none__"])
            .not("verified_at", "is", null);

          if (pkgMembers) {
            const pkgHouseIds = new Set<string>();
            for (const m of pkgMembers) {
              const mapId = hhToMapHouse.get(m.household_id);
              if (mapId) pkgHouseIds.add(mapId);
            }
            setStatuses(prev => {
              const updated = { ...prev };
              for (const h of loadedHouses) {
                if (pkgHouseIds.has(h.id) && updated[h.id] !== "blue") {
                  updated[h.id] = "orange";
                }
              }
              return updated;
            });
          }
        }

        // Bewohnerzahlen per map_house_id (skaliert auf beliebig viele Staedte)
        if (hhIds.length > 0) {
          const { data: memberData } = await supabase
            .from("household_members")
            .select("household_id")
            .in("household_id", hhIds)
            .not("verified_at", "is", null);

          if (memberData) {
            const counts: Record<string, number> = {};
            for (const m of memberData) {
              const mapHouseId = hhToMapHouse.get(m.household_id);
              if (mapHouseId) {
                counts[mapHouseId] = (counts[mapHouseId] ?? 0) + 1;
              }
            }
            setResidentCounts(counts);
          }
        }
      } catch {
        // Fallback — nichts zu tun
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [quarterId, mapConfig]);

  return { houses, geoHouses, statuses, residentCounts, loading };
}
