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
import { mergeMapStatus } from "@/lib/map-statuses";
import type { MapConfig } from "@/lib/quarters/types";

export interface MapStatusResult {
  houses: MapHouseData[];
  geoHouses: GeoMapHouseData[];
  statuses: Record<string, LampColor>;
  residentCounts: Record<string, number>;
  loading: boolean;
}

interface VerifiedMemberRow {
  household_id: string;
  user_id: string;
}

interface ActiveHelpRequestRow {
  user_id: string;
  expires_at: string | null;
}

interface ActiveAlertRow {
  household_id: string;
  category: string;
  is_emergency: boolean;
}

const ACTIVE_ALERT_STATUSES = ["open", "help_coming"] as const;
const CRITICAL_ALERT_CATEGORIES = new Set([
  "fire",
  "health_concern",
  "medical",
  "crime",
]);

function createDefaultStatuses(
  loadedHouses: Array<Pick<MapHouseData, "id" | "defaultColor">>,
): Record<string, LampColor> {
  const next: Record<string, LampColor> = {};
  loadedHouses.forEach((house) => {
    next[house.id] = house.defaultColor;
  });
  return next;
}

function buildResidentCounts(
  members: VerifiedMemberRow[],
  householdToMapId: Map<string, string>,
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const member of members) {
    const mapId = householdToMapId.get(member.household_id);
    if (!mapId) continue;
    counts[mapId] = (counts[mapId] ?? 0) + 1;
  }

  return counts;
}

function buildHouseholdsByUser(
  members: VerifiedMemberRow[],
): Map<string, Set<string>> {
  const householdsByUser = new Map<string, Set<string>>();

  for (const member of members) {
    if (!householdsByUser.has(member.user_id)) {
      householdsByUser.set(member.user_id, new Set());
    }
    householdsByUser.get(member.user_id)?.add(member.household_id);
  }

  return householdsByUser;
}

function addHouseholdsForUsers(
  target: Set<string>,
  householdsByUser: Map<string, Set<string>>,
  userIds: Iterable<string>,
) {
  for (const userId of userIds) {
    const householdIds = householdsByUser.get(userId);
    if (!householdIds) continue;
    for (const householdId of householdIds) {
      target.add(householdId);
    }
  }
}

function applyStatusToHouseholds(
  statuses: Record<string, LampColor>,
  householdIds: Iterable<string>,
  householdToMapId: Map<string, string>,
  color: LampColor,
) {
  for (const householdId of householdIds) {
    const mapId = householdToMapId.get(householdId);
    if (!mapId) continue;
    const current = statuses[mapId] ?? "green";
    statuses[mapId] = mergeMapStatus(current, color);
  }
}

function isHelpRequestActive(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() >= Date.now();
}

function isCriticalAlert(alert: ActiveAlertRow): boolean {
  return alert.is_emergency || CRITICAL_ALERT_CATEGORIES.has(alert.category);
}

async function loadLiveStatuses(
  supabase: ReturnType<typeof createClient>,
  {
    quarterId,
    householdIds,
    householdToMapId,
    defaultStatuses,
    today,
  }: {
    quarterId?: string;
    householdIds: string[];
    householdToMapId: Map<string, string>;
    defaultStatuses: Record<string, LampColor>;
    today: string;
  },
): Promise<{
  statuses: Record<string, LampColor>;
  residentCounts: Record<string, number>;
}> {
  if (householdIds.length === 0) {
    return { statuses: defaultStatuses, residentCounts: {} };
  }

  const { data: memberData } = await supabase
    .from("household_members")
    .select("household_id, user_id")
    .in("household_id", householdIds)
    .not("verified_at", "is", null);

  const members = (memberData ?? []) as VerifiedMemberRow[];
  const residentCounts = buildResidentCounts(members, householdToMapId);
  const statuses = { ...defaultStatuses };

  if (members.length === 0) {
    return { statuses, residentCounts };
  }

  const userIds = [...new Set(members.map((member) => member.user_id))];
  const householdsByUser = buildHouseholdsByUser(members);

  const vacationQuery = supabase
    .from("vacation_modes")
    .select("user_id")
    .lte("start_date", today)
    .gte("end_date", today)
    .in("user_id", userIds);

  const packageQuery = supabase
    .from("paketannahme")
    .select("user_id")
    .eq("available_date", today)
    .in("user_id", userIds);

  let helpQuery = supabase
    .from("help_requests")
    .select("user_id, expires_at")
    .eq("status", "active")
    .eq("type", "need")
    .in("user_id", userIds);

  if (quarterId) {
    helpQuery = helpQuery.eq("quarter_id", quarterId);
  }

  let alertQuery = supabase
    .from("alerts")
    .select("household_id, category, is_emergency")
    .in("household_id", householdIds)
    .in("status", ACTIVE_ALERT_STATUSES);

  if (quarterId) {
    alertQuery = alertQuery.eq("quarter_id", quarterId);
  }

  const [
    { data: vacations },
    { data: packages },
    { data: helpRequests },
    { data: alerts },
  ] = await Promise.all([
    vacationQuery,
    packageQuery,
    helpQuery,
    alertQuery,
  ]);

  const vacationHouseholds = new Set<string>();
  addHouseholdsForUsers(
    vacationHouseholds,
    householdsByUser,
    (vacations ?? []).map((vacation) => vacation.user_id),
  );
  applyStatusToHouseholds(
    statuses,
    vacationHouseholds,
    householdToMapId,
    "blue",
  );

  const packageHouseholds = new Set<string>();
  addHouseholdsForUsers(
    packageHouseholds,
    householdsByUser,
    (packages ?? []).map((pkg) => pkg.user_id),
  );
  applyStatusToHouseholds(
    statuses,
    packageHouseholds,
    householdToMapId,
    "orange",
  );

  const helpHouseholds = new Set<string>();
  const activeHelpRequests = (helpRequests ?? []) as ActiveHelpRequestRow[];
  addHouseholdsForUsers(
    helpHouseholds,
    householdsByUser,
    activeHelpRequests
      .filter((request) => isHelpRequestActive(request.expires_at))
      .map((request) => request.user_id),
  );
  applyStatusToHouseholds(
    statuses,
    helpHouseholds,
    householdToMapId,
    "yellow",
  );

  const yellowAlertHouseholds = new Set<string>();
  const redAlertHouseholds = new Set<string>();

  ((alerts ?? []) as ActiveAlertRow[]).forEach((alert) => {
    if (isCriticalAlert(alert)) {
      redAlertHouseholds.add(alert.household_id);
      return;
    }
    yellowAlertHouseholds.add(alert.household_id);
  });

  applyStatusToHouseholds(
    statuses,
    yellowAlertHouseholds,
    householdToMapId,
    "yellow",
  );
  applyStatusToHouseholds(
    statuses,
    redAlertHouseholds,
    householdToMapId,
    "red",
  );

  return { statuses, residentCounts };
}

/**
 * Laedt Haeuser, SOS-/Hilfestatus, Urlaubsstatus, Paketannahme und Bewohnerzahlen.
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
  const [statuses, setStatuses] = useState<Record<string, LampColor>>(() =>
    createDefaultStatuses(DEFAULT_HOUSES),
  );
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
        let householdToMapId = new Map<string, string>();

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
              householdToMapId = new Map(
                geo.map((house) => [house.id, house.id]),
              );
            }
          } else {
            const quarterHouses = await loadQuarterHouses(quarterId);
            if (quarterHouses.length > 0) {
              loadedHouses = quarterHouses;
            }
          }
        }

        const defaultStatuses = createDefaultStatuses(loadedHouses);

        setHouses(loadedHouses);
        setGeoHouses(loadedGeoHouses);
        setStatuses(defaultStatuses);
        setResidentCounts({});

        if (householdToMapId.size === 0) {
          const houseIds = loadedHouses.map((house) => house.id);

          const { data: hhData } = await supabase
            .from("households")
            .select("id, map_house_id")
            .in(
              "map_house_id",
              houseIds.length > 0 ? houseIds : ["__none__"],
            );

          if (hhData) {
            hhData.forEach((household) => {
              if (!household.map_house_id) return;
              householdToMapId.set(household.id, household.map_house_id);
            });
          }
        }

        const liveData = await loadLiveStatuses(supabase, {
          quarterId,
          householdIds: [...householdToMapId.keys()],
          householdToMapId,
          defaultStatuses,
          today: new Date().toISOString().split("T")[0],
        });

        setStatuses(liveData.statuses);
        setResidentCounts(liveData.residentCounts);
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
