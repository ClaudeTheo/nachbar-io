export const HOUSEHOLD_POSITION_SOURCES = [
  "lgl_bw_house_coordinate",
  "lgl_bw_address_match",
  "geocoder_rooftop",
  "geocoder_interpolated",
  "geocoder_street",
  "geocoder_approximate",
  "manual_svg_legacy",
  "manual_pin_confirmation",
  "unknown",
] as const;

export type HouseholdPositionSource =
  (typeof HOUSEHOLD_POSITION_SOURCES)[number];

export const HOUSEHOLD_POSITION_ACCURACIES = [
  "building",
  "rooftop",
  "interpolated",
  "street",
  "approximate",
  "unknown",
] as const;

export type HouseholdPositionAccuracy =
  (typeof HOUSEHOLD_POSITION_ACCURACIES)[number];

export function isHouseholdPositionSource(
  value: unknown,
): value is HouseholdPositionSource {
  return (
    typeof value === "string" &&
    HOUSEHOLD_POSITION_SOURCES.includes(value as HouseholdPositionSource)
  );
}

export function isHouseholdPositionAccuracy(
  value: unknown,
): value is HouseholdPositionAccuracy {
  return (
    typeof value === "string" &&
    HOUSEHOLD_POSITION_ACCURACIES.includes(
      value as HouseholdPositionAccuracy,
    )
  );
}

export function isMissingHouseholdPositionMetadataColumn(error: {
  message?: string | null;
  details?: string | null;
}): boolean {
  const haystack = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return (
    haystack.includes("position_source") ||
    haystack.includes("position_accuracy") ||
    haystack.includes("position_verified") ||
    haystack.includes("position_manual_override") ||
    haystack.includes("position_raw_payload") ||
    haystack.includes("postal_code") ||
    haystack.includes("city")
  );
}
