// Nachbar.io — Geocoding-Script fuer Bad Saeckingen
// Liest alle Haeuser aus map_houses und setzt lat/lng per Nominatim
//
// Ausfuehrung: npx tsx scripts/geocode-houses.ts
//
// Voraussetzung: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Fehler: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY muessen gesetzt sein.");
  console.error("Tipp: dotenv laden mit 'npx dotenv -e .env.local -- npx tsx scripts/geocode-houses.ts'");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Nominatim Rate Limit: max 1 Request/Sekunde
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "QuartierApp/1.0 (geocoding script)";

// Street-Code zu vollem Strassennamen
const STREET_MAP: Record<string, string> = {
  PS: "Purkersdorfer Straße",
  SN: "Sanarystraße",
  OR: "Oberer Rebberg",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeAddress(street: string, houseNumber: string): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({
    format: "json",
    street: `${houseNumber} ${street}`,
    city: "Bad Säckingen",
    country: "Germany",
    limit: "1",
  });

  const resp = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!resp.ok) {
    console.error(`  HTTP ${resp.status} fuer ${street} ${houseNumber}`);
    return null;
  }

  const data = await resp.json();
  if (data.length === 0) return null;

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function main() {
  console.log("Lade Haeuser aus map_houses...");

  const { data: houses, error } = await supabase
    .from("map_houses")
    .select("id, house_number, street_code, lat, lng")
    .order("street_code");

  if (error || !houses) {
    console.error("Fehler beim Laden:", error?.message);
    process.exit(1);
  }

  // Nur Haeuser ohne Geo-Koordinaten
  const missing = houses.filter((h) => h.lat == null || h.lng == null);
  console.log(`${houses.length} Haeuser gesamt, ${missing.length} ohne Geo-Koordinaten\n`);

  if (missing.length === 0) {
    console.log("Alle Haeuser haben bereits Koordinaten.");
    return;
  }

  let success = 0;
  let failed = 0;

  for (const house of missing) {
    const street = STREET_MAP[house.street_code] ?? house.street_code;
    process.stdout.write(`Geocode: ${street} ${house.house_number} ... `);

    const coords = await geocodeAddress(street, house.house_number);

    if (coords) {
      const { error: updateError } = await supabase
        .from("map_houses")
        .update({ lat: coords.lat, lng: coords.lng })
        .eq("id", house.id);

      if (updateError) {
        console.log(`DB-Fehler: ${updateError.message}`);
        failed++;
      } else {
        console.log(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        success++;
      }
    } else {
      console.log("nicht gefunden");
      failed++;
    }

    // Nominatim Rate Limit einhalten
    await sleep(1100);
  }

  console.log(`\nFertig: ${success} geocodiert, ${failed} fehlgeschlagen`);
}

main().catch(console.error);
