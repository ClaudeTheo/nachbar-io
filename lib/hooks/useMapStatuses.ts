// Wiederverwendbarer Hook fuer Karten-Status-Logik
// Extrahiert aus NachbarKarte.tsx — wird von SVG-Karte und Leaflet-Karte genutzt

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_HOUSES,
  loadQuarterHouses,
  loadGeoQuarterHouses,
  isGeoQuarter,
  STREET_CODE_TO_NAME,
  type MapHouseData,
  type GeoMapHouseData,
  type LampColor,
  type StreetCode,
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

        // Aktive Urlaube laden — Häuser blau färben
        const today = new Date().toISOString().split("T")[0];
        const { data: vacations } = await supabase
          .from("vacation_modes")
          .select("user_id")
          .lte("start_date", today)
          .gte("end_date", today);

        if (vacations && vacations.length > 0) {
          // User-IDs mit aktivem Urlaub
          const vacUserIds = vacations.map(v => v.user_id);

          // Deren Haushalte finden
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
                // Finde den street_code für diesen Straßennamen
                const code = (Object.entries(STREET_CODE_TO_NAME) as [StreetCode, string][])
                  .find(([, name]) => name === hh.street_name)?.[0];
                if (code) {
                  vacHouseKeys[`${code}:${hh.house_number}`] = true;
                }
              }
            }

            // Statuses aktualisieren
            setStatuses(prev => {
              const updated = { ...prev };
              for (const h of loadedHouses) {
                if (vacHouseKeys[`${h.s}:${h.num}`]) {
                  updated[h.id] = "blue";
                }
              }
              return updated;
            });
          }
        }

        // Aktive Paketannahmen laden — Häuser orange färben
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
                if (code) {
                  pkgHouseKeys[`${code}:${hh.house_number}`] = true;
                }
              }
            }

            setStatuses(prev => {
              const updated = { ...prev };
              for (const h of loadedHouses) {
                // Paketannahme nur setzen wenn nicht schon blau (Urlaub hat Vorrang)
                if (pkgHouseKeys[`${h.s}:${h.num}`] && updated[h.id] !== "blue") {
                  updated[h.id] = "orange";
                }
              }
              return updated;
            });
          }
        }

        // Bewohnerzahlen laden (aggregiert)
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
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [quarterId, mapConfig]);

  return { houses, geoHouses, statuses, residentCounts, loading };
}
