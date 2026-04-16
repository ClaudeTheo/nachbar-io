import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { ServiceError, handleServiceError } from "@/lib/services/service-error";
import {
  isHouseholdPositionAccuracy,
  isHouseholdPositionSource,
  isMissingHouseholdPositionMetadataColumn,
  type HouseholdPositionAccuracy,
  type HouseholdPositionSource,
} from "@/lib/household-position-metadata";

interface ConfirmPositionBody {
  lat?: number | string | null;
  lng?: number | string | null;
  manualOverride?: boolean;
  source?: string | null;
  accuracy?: string | null;
}

interface GeoPoint {
  lat: number;
  lng: number;
}

interface HouseholdPositionRow {
  id: string;
  street_name: string;
  house_number: string;
  lat: number | null;
  lng: number | null;
  quarter_id: string;
  position_source?: string | null;
  position_accuracy?: string | null;
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

function parseFiniteCoordinate(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return Number(value);
  }

  return Number.NaN;
}

function isUsefulSource(
  value: string | null | undefined,
): value is HouseholdPositionSource {
  return isHouseholdPositionSource(value) && value !== "unknown";
}

function isUsefulAccuracy(
  value: string | null | undefined,
): value is HouseholdPositionAccuracy {
  return isHouseholdPositionAccuracy(value) && value !== "unknown";
}

async function loadHouseholdForConfirmation(
  admin: ReturnType<typeof getAdminSupabase>,
  householdId: string,
): Promise<{ household: HouseholdPositionRow; metadataAvailable: boolean }> {
  const withMetadata = await admin
    .from("households")
    .select(
      "id, street_name, house_number, lat, lng, quarter_id, position_source, position_accuracy",
    )
    .eq("id", householdId)
    .single();

  if (withMetadata.error && isMissingHouseholdPositionMetadataColumn(withMetadata.error)) {
    const fallback = await admin
      .from("households")
      .select("id, street_name, house_number, lat, lng, quarter_id")
      .eq("id", householdId)
      .single();

    if (fallback.error || !fallback.data) {
      throw fallback.error ?? new ServiceError("Haushalt konnte nicht geladen werden.", 404);
    }

    return {
      household: fallback.data as HouseholdPositionRow,
      metadataAvailable: false,
    };
  }

  if (withMetadata.error || !withMetadata.data) {
    throw withMetadata.error ?? new ServiceError("Haushalt konnte nicht geladen werden.", 404);
  }

  return {
    household: withMetadata.data as HouseholdPositionRow,
    metadataAvailable: true,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ConfirmPositionBody;
    const lat = parseFiniteCoordinate(body.lat);
    const lng = parseFiniteCoordinate(body.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new ServiceError("Lat/Lng fehlen oder sind ungueltig.", 400);
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new ServiceError("Lat/Lng liegen ausserhalb des gueltigen Bereichs.", 400);
    }

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

    const { household } = await loadHouseholdForConfirmation(
      admin,
      membership.household_id,
    );

    const { data: quarter, error: quarterError } = await admin
      .from("quarters")
      .select("city, postal_code")
      .eq("id", household.quarter_id)
      .single();

    if (quarterError || !quarter) {
      throw new ServiceError("Quartier konnte nicht geladen werden.", 404);
    }

    const confirmed = { lat, lng };
    const previous =
      typeof household.lat === "number" &&
      typeof household.lng === "number" &&
      Number.isFinite(household.lat) &&
      Number.isFinite(household.lng)
        ? { lat: household.lat, lng: household.lng }
        : null;
    const distanceMeters = previous
      ? Math.round(haversineMeters(previous, confirmed))
      : null;
    const manualOverride =
      typeof body.manualOverride === "boolean"
        ? body.manualOverride
        : distanceMeters != null
          ? distanceMeters > 2
          : false;
    const requestedSource = isHouseholdPositionSource(body.source)
      ? body.source
      : null;
    const requestedAccuracy = isHouseholdPositionAccuracy(body.accuracy)
      ? body.accuracy
      : null;
    const effectiveSource =
      requestedSource ??
      (isUsefulSource(household.position_source)
        ? household.position_source
        : manualOverride
          ? "manual_pin_confirmation"
          : "unknown");
    const effectiveAccuracy =
      requestedAccuracy ??
      (isUsefulAccuracy(household.position_accuracy)
        ? household.position_accuracy
        : manualOverride
          ? "approximate"
          : "unknown");

    let metadataSaved = true;
    const metadataPatch: Record<string, unknown> = {
      lat,
      lng,
      postal_code: quarter.postal_code,
      city: quarter.city,
      position_source: effectiveSource,
      position_accuracy: effectiveAccuracy,
      position_verified: true,
      position_verified_at: new Date().toISOString(),
      position_manual_override: manualOverride,
      position_raw_payload: {
        confirmed_via: "profile_map_position",
        requested_source: requestedSource,
        requested_accuracy: requestedAccuracy,
        previous,
        confirmed,
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
        .update({ lat, lng })
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
      confirmed,
      distanceMeters,
      manualOverride,
      source: effectiveSource,
      accuracy: effectiveAccuracy,
      metadataSaved,
    });
  } catch (error) {
    return handleServiceError(error);
  }
}
