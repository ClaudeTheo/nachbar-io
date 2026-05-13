import type { SupabaseClient } from "@supabase/supabase-js";

import type { MapActivityPin, MapActivityPinType } from "@/lib/map-activity-pins";
import { isUserUiMode, type UserUiMode } from "@/lib/user-modes";

export type MapActivityLocationPrecision =
  | "exact"
  | "approx_50m"
  | "approx_quarter";

export type MapActivityVisibility =
  | "public"
  | "youth_safe"
  | "adult"
  | "caregiver"
  | "own";

export type MapActivitySource =
  | "alerts"
  | "events"
  | "help_requests"
  | "youth_tasks";

export interface MapActivityFeedCandidate extends MapActivityPin {
  locationPrecision: MapActivityLocationPrecision;
  visibility: MapActivityVisibility;
  source: MapActivitySource;
  startsAt?: string;
  href?: string;
  ownerUserId?: string | null;
  householdId?: string | null;
}

export type MapActivityFeedItem = Omit<
  MapActivityFeedCandidate,
  "ownerUserId" | "householdId"
>;

export interface MapActivityFeedContext {
  mode: UserUiMode;
  userId: string;
  role?: string | null;
  householdId?: string | null;
}

export interface AlertActivityRow {
  id: string;
  category: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  is_emergency: boolean | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string | null;
}

const ACTIVE_ALERT_STATUSES = new Set(["open", "help_coming"]);
const CAREGIVER_ROLES = new Set([
  "caregiver",
  "org_admin",
  "org_viewer",
  "doctor",
  "doctor_admin",
  "admin",
  "super_admin",
]);

export function resolveMapActivityMode(
  requestedMode: unknown,
  profileMode: unknown,
): UserUiMode {
  const safeProfileMode = isUserUiMode(profileMode) ? profileMode : "active";

  if (safeProfileMode === "youth") {
    return "youth";
  }

  if (requestedMode === "youth") {
    return safeProfileMode;
  }

  return isUserUiMode(requestedMode) ? requestedMode : safeProfileMode;
}

function isFiniteCoordinate(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function coarsenCoordinate(value: number): number {
  return Number(value.toFixed(3));
}

function canSeePin(
  pin: MapActivityFeedCandidate,
  context: MapActivityFeedContext,
): boolean {
  switch (pin.visibility) {
    case "public":
      return true;
    case "youth_safe":
      return context.mode !== "senior";
    case "adult":
      return context.mode !== "youth";
    case "caregiver":
      return CAREGIVER_ROLES.has(context.role ?? "");
    case "own":
      return (
        pin.ownerUserId === context.userId ||
        (Boolean(pin.householdId) && pin.householdId === context.householdId)
      );
  }
}

function sanitizePinForContext(
  pin: MapActivityFeedCandidate,
  context: MapActivityFeedContext,
): MapActivityFeedItem | null {
  if (!canSeePin(pin, context)) {
    return null;
  }

  if (!isFiniteCoordinate(pin.lat) || !isFiniteCoordinate(pin.lng)) {
    return null;
  }

  const canUseExactLocation =
    pin.locationPrecision === "exact" && context.mode !== "youth";
  const locationPrecision = canUseExactLocation
    ? pin.locationPrecision
    : pin.locationPrecision === "exact"
      ? "approx_50m"
      : pin.locationPrecision;

  return {
    id: pin.id,
    type: pin.type,
    lat: canUseExactLocation ? pin.lat : coarsenCoordinate(pin.lat),
    lng: canUseExactLocation ? pin.lng : coarsenCoordinate(pin.lng),
    title: pin.title,
    description: pin.description,
    approximate: pin.approximate ?? !canUseExactLocation,
    locationPrecision,
    visibility: pin.visibility,
    source: pin.source,
    startsAt: pin.startsAt,
    href: pin.href,
  };
}

export function filterMapActivityFeedForContext(
  candidates: MapActivityFeedCandidate[],
  context: MapActivityFeedContext,
): MapActivityFeedItem[] {
  return candidates
    .map((pin) => sanitizePinForContext(pin, context))
    .filter((pin): pin is MapActivityFeedItem => pin !== null);
}

function mapAlertCategoryToPinType(_category: string | null): MapActivityPinType {
  return "warning";
}

export function mapAlertRowsToActivityCandidates(
  rows: AlertActivityRow[],
): MapActivityFeedCandidate[] {
  return rows.flatMap((row) => {
    if (!ACTIVE_ALERT_STATUSES.has(row.status ?? "")) {
      return [];
    }

    if (!isFiniteCoordinate(row.location_lat) || !isFiniteCoordinate(row.location_lng)) {
      return [];
    }

    return [
      {
        id: `alert-${row.id}`,
        type: mapAlertCategoryToPinType(row.category),
        lat: row.location_lat,
        lng: row.location_lng,
        title: row.title?.trim() || "Hinweis im Quartier",
        description: row.description?.trim() || undefined,
        approximate: true,
        locationPrecision: "approx_50m",
        visibility: "public",
        source: "alerts",
        startsAt: row.created_at ?? undefined,
        href: "/alerts",
      },
    ];
  });
}

export async function loadMapActivityFeed({
  supabase,
  quarterId,
  context,
}: {
  supabase: SupabaseClient;
  quarterId: string | null;
  context: MapActivityFeedContext;
}): Promise<MapActivityFeedItem[]> {
  let query = supabase
    .from("alerts")
    .select(
      "id, category, title, description, status, is_emergency, location_lat, location_lng, created_at",
    )
    .in("status", ["open", "help_coming"])
    .not("location_lat", "is", null)
    .not("location_lng", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (quarterId) {
    query = query.eq("quarter_id", quarterId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return filterMapActivityFeedForContext(
    mapAlertRowsToActivityCandidates((data ?? []) as AlertActivityRow[]),
    context,
  );
}
