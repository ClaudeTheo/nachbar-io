import type { Country, QuarterCountryInput } from "./types";

// Leitet das relevante Land aus dem Quartier ab. Fallback: DE (Pilot).
export function resolveCountryFromQuarter(
  quarter: QuarterCountryInput | null,
): Country {
  if (!quarter) return "DE";
  if (quarter.country === "CH") return "CH";
  if (quarter.country === "DE") return "DE";
  return "DE";
}
