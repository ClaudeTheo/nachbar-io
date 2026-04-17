/**
 * scripts/resolve-all-positions.ts
 *
 * One-shot script: Resolve all Bad Säckingen household positions
 * via LGL-BW WFS Hauskoordinaten service and update the database.
 *
 * Usage: npx tsx scripts/resolve-all-positions.ts
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  resolveLglBwHouseCoordinate,
  type SearchBounds,
  type GeoPoint,
} from "../lib/geocoding/lgl-bw";

// Parse .env.local manually to avoid \n issues
function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  const content = fs.readFileSync(envPath, "utf-8");
  const vars: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (match) {
      vars[match[1]] = match[2].replace(/\\n/g, "").trim();
    }
  }
  return vars;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  console.error(
    "URL:",
    SUPABASE_URL?.substring(0, 20),
    "KEY len:",
    SUPABASE_SERVICE_KEY?.length,
  );
  process.exit(1);
}

console.log("Supabase URL:", SUPABASE_URL);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Bad Säckingen bounding box (generous)
const BS_BOUNDS: SearchBounds = {
  minLat: 47.545,
  maxLat: 47.575,
  minLng: 7.935,
  maxLng: 7.975,
};

// Filter: only BW addresses (lat ~47.5x, lng ~7.9x area)
function isBadSaeckingen(lat: number, lng: number): boolean {
  return lat > 47.54 && lat < 47.58 && lng > 7.78 && lng < 8.1;
}

async function main() {
  const { data: households, error } = await supabase
    .from("households")
    .select("id, street_name, house_number, lat, lng, position_source")
    .order("street_name");

  if (error || !households) {
    console.error("Failed to load households:", error);
    process.exit(1);
  }

  const bsHouseholds = households.filter((h) => isBadSaeckingen(h.lat, h.lng));

  console.log(
    `Found ${bsHouseholds.length} Bad Säckingen households to resolve.\n`,
  );

  let resolved = 0;
  let candidates = 0;
  let failed = 0;

  for (const h of bsHouseholds) {
    const hint: GeoPoint = { lat: h.lat, lng: h.lng };

    try {
      const result = await resolveLglBwHouseCoordinate(
        {
          streetName: h.street_name,
          houseNumber: h.house_number,
          postalCode: "79713",
          city: "Bad Säckingen",
        },
        BS_BOUNDS,
        hint,
      );

      if (result.match) {
        const { lat, lng } = result.match;
        const { error: updateErr } = await supabase
          .from("households")
          .update({
            lat,
            lng,
            position_source: "lgl_bw_house_coordinate",
            position_accuracy: "building",
            position_verified: true,
            position_verified_at: new Date().toISOString(),
            position_manual_override: false,
          })
          .eq("id", h.id);

        if (updateErr) {
          console.error(
            `  ERROR updating ${h.street_name} ${h.house_number}:`,
            updateErr.message,
          );
          failed++;
        } else {
          const dist = haversine(h.lat, h.lng, lat, lng);
          console.log(
            `  OK  ${h.street_name} ${h.house_number}: (${h.lat}, ${h.lng}) -> (${lat}, ${lng}) [${dist.toFixed(1)}m]`,
          );
          resolved++;
        }
      } else if (result.candidate) {
        const { lat, lng } = result.candidate.feature;
        const dist = haversine(h.lat, h.lng, lat, lng);
        console.log(
          `  ~   ${h.street_name} ${h.house_number}: candidate (${result.candidate.confidence}, ${dist.toFixed(1)}m) — applying`,
        );

        const { error: updateErr } = await supabase
          .from("households")
          .update({
            lat,
            lng,
            position_source: "lgl_bw_address_match",
            position_accuracy:
              result.candidate.confidence === "nearest_building"
                ? "building"
                : "street",
            position_verified: true,
            position_verified_at: new Date().toISOString(),
            position_manual_override: false,
          })
          .eq("id", h.id);

        if (updateErr) {
          console.error(
            `  ERROR updating candidate ${h.street_name} ${h.house_number}:`,
            updateErr.message,
          );
          failed++;
        } else {
          candidates++;
        }
      } else {
        console.log(
          `  X   ${h.street_name} ${h.house_number}: no match (inspected ${result.inspectedCount})`,
        );
        failed++;
      }

      // Fair-use delay: 200ms between requests
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(
        `  ERR ${h.street_name} ${h.house_number}:`,
        (err as Error).message,
      );
      failed++;
    }
  }

  console.log(
    `\nDone: ${resolved} exact, ${candidates} candidates, ${failed} failed out of ${bsHouseholds.length}`,
  );
}

function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

main().catch(console.error);
