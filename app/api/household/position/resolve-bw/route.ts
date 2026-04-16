import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { ServiceError, handleServiceError } from "@/lib/services/service-error";
import { isMissingHouseholdPositionMetadataColumn } from "@/lib/household-position-metadata";
import {
  buildSearchBoundsFromPoints,
  expandSearchBounds,
  resolveLglBwHouseCoordinate,
  type GeoPoint,
  type StructuredAddress,
} from "@/lib/geocoding/lgl-bw";

function normalizeState(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]+/g, "");
}

function isBadenWuerttemberg(state: string | null | undefined): boolean {
  return normalizeState(state).includes("badenwurttemberg");
}

function haversineMeters(from: GeoPoint, to: GeoPoint): number {
  const earthRadius = 6_371_000;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const admin = getAdminSupabase();

    const { data: membership, error: membershipError } = await admin
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .not("verified_at", "is", null)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      throw membershipError;
    }

    if (!membership?.household_id) {
      throw new ServiceError(
        "Kein verifizierter Haushalt fuer diesen Account gefunden.",
        404,
      );
    }

    const { data: household, error: householdError } = await admin
      .from("households")
      .select("id, street_name, house_number, lat, lng, quarter_id")
      .eq("id", membership.household_id)
      .single();

    if (householdError || !household) {
      throw new ServiceError("Haushalt konnte nicht geladen werden.", 404);
    }

    const { data: quarter, error: quarterError } = await admin
      .from("quarters")
      .select("id, city, state, postal_code")
      .eq("id", household.quarter_id)
      .single();

    if (quarterError || !quarter) {
      throw new ServiceError("Quartier konnte nicht geladen werden.", 404);
    }

    if (!isBadenWuerttemberg(quarter.state)) {
      throw new ServiceError(
        "Amtliche Hauskoordinaten sind aktuell nur fuer Baden-Wuerttemberg aktiviert.",
        400,
      );
    }

    const address: StructuredAddress = {
      streetName: household.street_name,
      houseNumber: household.house_number,
      postalCode: quarter.postal_code,
      city: quarter.city,
    };

    const { data: quarterHouseholds, error: quarterHouseholdsError } = await admin
      .from("households")
      .select("lat, lng")
      .eq("quarter_id", household.quarter_id)
      .not("lat", "is", null)
      .not("lng", "is", null)
      .limit(500);

    if (quarterHouseholdsError) {
      throw quarterHouseholdsError;
    }

    const geoPoints = (quarterHouseholds ?? [])
      .map((row) => ({ lat: row.lat as number, lng: row.lng as number }))
      .filter(
        (point) =>
          Number.isFinite(point.lat) &&
          Number.isFinite(point.lng) &&
          Math.abs(point.lat) > 0 &&
          Math.abs(point.lng) > 0,
      );

    if (
      geoPoints.length === 0 &&
      (!Number.isFinite(household.lat) || !Number.isFinite(household.lng))
    ) {
      throw new ServiceError(
        "Es gibt noch keine brauchbaren Kartenkoordinaten fuer dieses Quartier.",
        409,
      );
    }

    const baseBounds = buildSearchBoundsFromPoints(
      geoPoints.length > 0
        ? geoPoints
        : [{ lat: household.lat, lng: household.lng }],
    );
    const searchBounds = [
      baseBounds,
      expandSearchBounds(baseBounds, { lat: 0.0015, lng: 0.0025 }),
    ];
    const hint =
      Number.isFinite(household.lat) &&
      Number.isFinite(household.lng) &&
      Math.abs(household.lat) > 0 &&
      Math.abs(household.lng) > 0
        ? { lat: household.lat, lng: household.lng }
        : null;

    let resolved:
      | Awaited<ReturnType<typeof resolveLglBwHouseCoordinate>>
      | null = null;

    for (const bounds of searchBounds) {
      resolved = await resolveLglBwHouseCoordinate(address, bounds, hint);
      if (resolved.match) {
        break;
      }
    }

    if (!resolved?.match) {
      throw new ServiceError(
        `Keine amtliche Hauskoordinate fuer ${household.street_name} ${household.house_number} gefunden.`,
        404,
        undefined,
        {
          inspectedCount: resolved?.inspectedCount ?? 0,
          bbox: resolved?.bbox ?? null,
        },
      );
    }

    const previous =
      Number.isFinite(household.lat) &&
      Number.isFinite(household.lng) &&
      Math.abs(household.lat) > 0 &&
      Math.abs(household.lng) > 0
        ? { lat: household.lat, lng: household.lng }
        : null;
    const official = { lat: resolved.match.lat, lng: resolved.match.lng };

    let metadataSaved = true;
    const metadataPatch: Record<string, unknown> = {
      lat: official.lat,
      lng: official.lng,
      postal_code: quarter.postal_code,
      city: quarter.city,
      position_source: "lgl_bw_house_coordinate",
      position_accuracy: "building",
      position_verified: true,
      position_verified_at: new Date().toISOString(),
      position_manual_override: false,
      position_raw_payload: {
        address: {
          street_name: resolved.match.streetName,
          house_number: resolved.match.houseNumber,
          postal_code: resolved.match.postalCode,
          city: resolved.match.city,
        },
        lgl_id: resolved.match.id,
        bbox: resolved.bbox,
      },
    };

    let { error: updateError } = await admin
      .from("households")
      .update(metadataPatch as never)
      .eq("id", household.id);

    if (updateError && isMissingHouseholdPositionMetadataColumn(updateError)) {
      metadataSaved = false;
      const fallback = await admin
        .from("households")
        .update({ lat: official.lat, lng: official.lng })
        .eq("id", household.id);
      updateError = fallback.error;
    }

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      householdId: household.id,
      address: {
        streetName: household.street_name,
        houseNumber: household.house_number,
        postalCode: quarter.postal_code,
        city: quarter.city,
      },
      previous,
      official,
      distanceMeters: previous ? Math.round(haversineMeters(previous, official)) : null,
      inspectedCount: resolved.inspectedCount,
      bbox: resolved.bbox,
      metadataSaved,
    });
  } catch (error) {
    return handleServiceError(error);
  }
}
