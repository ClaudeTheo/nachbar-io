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
 * Laedt Haeuser, Urlaubsstatus (blau), Paketannahme (orange) und Bewohnerzahlen.
 * Unterstuetzt sowohl SVG- als auch Leaflet-Quartiere (via mapConfig.type).
 * Leaflet: Marker direkt aus households (automatisch fuer jedes Quartier).
 * SVG: Marker aus map_houses (Legacy Pilot-Quartier).
 */
export function useMapStatuses(
  quarterId?: string,
  mapConfig?: MapConfig,
  centerLat?: number,
  centerLng?: number,
): MapStatusResult {
  const [houses, setHouses] = useState<MapHouseData[]>(DEFAULT_HOUSES);
  const [geoHouses, setGeoHouses] = useState<GeoMapHouseData[]>([]);
  const [statuses, setStatuses] = useState<Record<string, LampColor>>(() => {
    const s: Record<string, LampColor> = {};
    DEFAULT_HOUSES.forEach((h) => {
      s[h.id] = h.defaultColor;
    });
    return s;
  });
  const [residentCounts, setResidentCounts] = useState<Record<string, number>>(
    {},
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const supabase = createClient();
        const useGeo =
          isGeoQuarter(mapConfig) || (centerLat != null && centerLng != null);

        // Haeuser fuer aktuelles Quartier laden (SVG oder Geo/Leaflet)
        let loadedHouses: MapHouseData[] = DEFAULT_HOUSES;
        let loadedGeoHouses: GeoMapHouseData[] = [];
        // Bei Leaflet: house.id = household.id (direkte Zuordnung)
        let isHouseholdBased = false;

        if (quarterId) {
          if (useGeo) {
            const geo = await loadGeoQuarterHouses(
              quarterId,
              centerLat,
              centerLng,
            );
            if (geo.length > 0) {
              loadedGeoHouses = geo;
              loadedHouses = geo;
              isHouseholdBased = true; // IDs sind household-IDs
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
          loadedHouses.forEach((h) => {
            s[h.id] = h.defaultColor;
          });
          return s;
        });

        // --- Status-Lookup unterscheidet sich je nach Datenquelle ---

        if (isHouseholdBased) {
          // LEAFLET: house.id = household.id → direkte Zuordnung, kein map_house_id noetig
          const householdIds = loadedHouses.map((h) => h.id);

          // Aktive Urlaube laden — Haeuser blau faerben
          const today = new Date().toISOString().split("T")[0];
          const { data: vacations } = await supabase
            .from("vacation_modes")
            .select("user_id")
            .lte("start_date", today)
            .gte("end_date", today);

          if (vacations && vacations.length > 0) {
            const vacUserIds = vacations.map((v) => v.user_id);
            const { data: members } = await supabase
              .from("household_members")
              .select("household_id")
              .in("user_id", vacUserIds)
              .in("household_id", householdIds)
              .not("verified_at", "is", null);

            if (members) {
              const vacIds = new Set(members.map((m) => m.household_id));
              setStatuses((prev) => {
                const updated = { ...prev };
                for (const id of vacIds) updated[id] = "blue";
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
            const pkgUserIds = packages.map((p) => p.user_id);
            const { data: pkgMembers } = await supabase
              .from("household_members")
              .select("household_id")
              .in("user_id", pkgUserIds)
              .in("household_id", householdIds)
              .not("verified_at", "is", null);

            if (pkgMembers) {
              const pkgIds = new Set(pkgMembers.map((m) => m.household_id));
              setStatuses((prev) => {
                const updated = { ...prev };
                for (const id of pkgIds) {
                  if (updated[id] !== "blue") updated[id] = "orange";
                }
                return updated;
              });
            }
          }

          // Bewohnerzahlen direkt per household_id
          const { data: memberData } = await supabase
            .from("household_members")
            .select("household_id")
            .in("household_id", householdIds)
            .not("verified_at", "is", null);

          if (memberData) {
            const counts: Record<string, number> = {};
            for (const m of memberData) {
              counts[m.household_id] = (counts[m.household_id] ?? 0) + 1;
            }
            setResidentCounts(counts);
          }
        } else {
          // SVG / LEGACY: Indirekte Zuordnung ueber map_house_id
          const houseIds = loadedHouses.map((h) => h.id);

          const { data: hhData } = await supabase
            .from("households")
            .select("id, map_house_id")
            .in("map_house_id", houseIds.length > 0 ? houseIds : ["__none__"]);

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

          const today = new Date().toISOString().split("T")[0];
          const { data: vacations } = await supabase
            .from("vacation_modes")
            .select("user_id")
            .lte("start_date", today)
            .gte("end_date", today);

          if (vacations && vacations.length > 0) {
            const vacUserIds = vacations.map((v) => v.user_id);
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
              setStatuses((prev) => {
                const updated = { ...prev };
                for (const h of loadedHouses) {
                  if (vacHouseIds.has(h.id)) updated[h.id] = "blue";
                }
                return updated;
              });
            }
          }

          const { data: packages } = await supabase
            .from("paketannahme")
            .select("user_id")
            .eq("available_date", today);

          if (packages && packages.length > 0) {
            const pkgUserIds = packages.map((p) => p.user_id);
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
              setStatuses((prev) => {
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
        }
      } catch {
        // Fallback — nichts zu tun
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [quarterId, mapConfig, centerLat, centerLng]);

  return { houses, geoHouses, statuses, residentCounts, loading };
}
