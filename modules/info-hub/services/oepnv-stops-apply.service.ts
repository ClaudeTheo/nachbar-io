// Welle I — Apply-Service: schreibt validierte OEPNV-Stops in
// municipal_config.oepnv_stops. Komplementaer zur Discover-Route (Welle H).

import type { SupabaseClient } from "@supabase/supabase-js";

export interface OepnvStopInput {
  id: string;
  name: string;
}

export interface ApplyOepnvStopsResult {
  savedCount: number;
}

const MAX_STOPS = 25;

export async function applyOepnvStopsForQuarter(
  supabase: SupabaseClient,
  quarterId: string,
  stops: OepnvStopInput[],
): Promise<ApplyOepnvStopsResult> {
  if (!Array.isArray(stops)) {
    throw new Error("stops muss ein Array sein.");
  }
  if (stops.length > MAX_STOPS) {
    throw new Error(
      `Zu viele Stops (${stops.length}) — max ${MAX_STOPS} erlaubt.`,
    );
  }

  const normalized: OepnvStopInput[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < stops.length; i++) {
    const raw = stops[i];
    const idRaw = (raw as { id?: unknown })?.id;
    const nameRaw = (raw as { name?: unknown })?.name;

    if (typeof idRaw !== "string" || idRaw.trim().length === 0) {
      throw new Error(
        `Stop[${i}]: id ist Pflicht und muss ein nicht-leerer String sein.`,
      );
    }
    if (typeof nameRaw !== "string" || nameRaw.trim().length === 0) {
      throw new Error(
        `Stop[${i}]: name ist Pflicht und muss ein nicht-leerer String sein.`,
      );
    }

    const id = idRaw.trim();
    const name = nameRaw.trim();

    if (seen.has(id)) continue;
    seen.add(id);
    normalized.push({ id, name });
  }

  const { error } = await supabase
    .from("municipal_config")
    .update({
      oepnv_stops: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("quarter_id", quarterId);

  if (error) {
    throw new Error(error.message ?? String(error));
  }

  return { savedCount: normalized.length };
}
