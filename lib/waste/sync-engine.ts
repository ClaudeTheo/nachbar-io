// Sync-Engine: Holt Termine aus Quellen, diffed gegen DB, aktualisiert
// Wird von /api/cron/waste-sync aufgerufen

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchIcsWasteDates, type RawWasteDate } from "./ics-connector";
import { parseCsvWasteDates } from "./csv-connector";
import type { WasteSourceRegistry, WasteCollectionArea } from "@/lib/municipal/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

/** Ergebnis eines Sync-Laufs fuer eine Quelle */
export interface SyncResult {
  source_slug: string;
  status: "success" | "partial" | "error";
  dates_fetched: number;
  dates_inserted: number;
  dates_updated: number;
  dates_unchanged: number;
  dates_cancelled: number;
  has_changes: boolean;
  errors: string[];
}

/**
 * Fuehrt den Sync fuer alle faelligen Quellen durch.
 * Wird vom Cron-Job aufgerufen.
 */
export async function runWasteSync(): Promise<{
  synced: number;
  results: SyncResult[];
  errors: string[];
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: SyncResult[] = [];
  const globalErrors: string[] = [];

  // 1. Faellige Quellen laden
  const { data: sources, error: srcError } = await supabase
    .from("waste_source_registry")
    .select("*")
    .eq("sync_enabled", true)
    .or(`next_sync_at.is.null,next_sync_at.lte.${new Date().toISOString()}`);

  if (srcError) {
    globalErrors.push(`Quellen laden: ${srcError.message}`);
    return { synced: 0, results, errors: globalErrors };
  }

  if (!sources || sources.length === 0) {
    return { synced: 0, results, errors: [] };
  }

  // 2. Pro Quelle: Sync durchfuehren
  for (const source of sources as WasteSourceRegistry[]) {
    const result = await syncSource(supabase, source);
    results.push(result);
  }

  return {
    synced: results.filter((r) => r.status !== "error").length,
    results,
    errors: globalErrors,
  };
}

/**
 * Sync fuer eine einzelne Quelle.
 */
async function syncSource(
  supabase: AnySupabase,
  source: WasteSourceRegistry
): Promise<SyncResult> {
  const batchId = crypto.randomUUID();
  const errors: string[] = [];
  let datesFetched = 0;
  let datesInserted = 0;
  let datesUpdated = 0;
  let datesUnchanged = 0;
  let datesCancelled = 0;

  // Sync-Log starten
  await supabase.from("waste_sync_log").insert({
    source_id: source.id,
    batch_id: batchId,
    status: "running",
  });

  try {
    // Areas fuer diese Quelle laden (nur aktive, nicht deprecated)
    const { data: areas } = await supabase
      .from("waste_collection_areas")
      .select("*")
      .eq("source_id", source.id)
      .eq("deprecated", false);

    if (!areas || areas.length === 0) {
      throw new Error("Keine Abfuhrgebiete konfiguriert");
    }

    // Pro Area: Daten holen
    for (const area of areas as WasteCollectionArea[]) {
      const areaResult = await syncArea(supabase, source, area, batchId);
      datesFetched += areaResult.fetched;
      datesInserted += areaResult.inserted;
      datesUpdated += areaResult.updated;
      datesUnchanged += areaResult.unchanged;
      datesCancelled += areaResult.cancelled;
      errors.push(...areaResult.errors);
    }

    const status = errors.length > 0 ? "partial" : "success";
    const hasChanges = datesInserted > 0 || datesUpdated > 0 || datesCancelled > 0;

    // Sync-Log abschliessen
    await supabase
      .from("waste_sync_log")
      .update({
        finished_at: new Date().toISOString(),
        status,
        dates_fetched: datesFetched,
        dates_inserted: datesInserted,
        dates_updated: datesUpdated,
        dates_unchanged: datesUnchanged,
        dates_cancelled: datesCancelled,
        has_changes: hasChanges,
        error_message: errors.length > 0 ? errors.join("; ") : null,
      })
      .eq("batch_id", batchId);

    // Quelle aktualisieren
    await supabase
      .from("waste_source_registry")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: status,
        last_sync_error: errors.length > 0 ? errors[0] : null,
        last_sync_dates_count: datesFetched,
        next_sync_at: new Date(
          Date.now() + source.sync_interval_hours * 3600000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", source.id);

    return {
      source_slug: source.slug,
      status,
      dates_fetched: datesFetched,
      dates_inserted: datesInserted,
      dates_updated: datesUpdated,
      dates_unchanged: datesUnchanged,
      dates_cancelled: datesCancelled,
      has_changes: hasChanges,
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Sync-Log als Fehler markieren
    await supabase
      .from("waste_sync_log")
      .update({
        finished_at: new Date().toISOString(),
        status: "error",
        error_message: errorMsg,
      })
      .eq("batch_id", batchId);

    // Quelle aktualisieren
    await supabase
      .from("waste_source_registry")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: "error",
        last_sync_error: errorMsg,
        next_sync_at: new Date(
          Date.now() + source.sync_interval_hours * 3600000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", source.id);

    return {
      source_slug: source.slug,
      status: "error",
      dates_fetched: 0,
      dates_inserted: 0,
      dates_updated: 0,
      dates_unchanged: 0,
      dates_cancelled: 0,
      has_changes: false,
      errors: [errorMsg],
    };
  }
}

/**
 * Sync fuer ein einzelnes Abfuhrgebiet.
 */
async function syncArea(
  supabase: AnySupabase,
  source: WasteSourceRegistry,
  area: WasteCollectionArea,
  batchId: string
): Promise<{
  fetched: number;
  inserted: number;
  updated: number;
  unchanged: number;
  cancelled: number;
  errors: string[];
}> {
  const errors: string[] = [];

  // Daten je nach Connector-Typ holen
  let rawDates: RawWasteDate[] = [];

  const icsUrl = area.ics_url || (source.connector_config as { url?: string }).url;

  if (source.connector_type === "ics") {
    if (!icsUrl) {
      return { fetched: 0, inserted: 0, updated: 0, unchanged: 0, cancelled: 0, errors: ["Keine ICS-URL konfiguriert"] };
    }
    const result = await fetchIcsWasteDates({ url: icsUrl });
    if (!result.success) {
      return { fetched: 0, inserted: 0, updated: 0, unchanged: 0, cancelled: 0, errors: result.errors };
    }
    rawDates = result.dates;
    errors.push(...result.errors);
  } else if (source.connector_type === "csv") {
    const csvContent = (source.connector_config as { content?: string }).content;
    if (!csvContent) {
      return { fetched: 0, inserted: 0, updated: 0, unchanged: 0, cancelled: 0, errors: ["Kein CSV-Inhalt konfiguriert"] };
    }
    const result = parseCsvWasteDates(csvContent);
    rawDates = result.dates;
    errors.push(...result.errors);
  } else if (source.connector_type === "manual") {
    // Keine automatische Synchronisierung — manuell gepflegt
    return { fetched: 0, inserted: 0, updated: 0, unchanged: 0, cancelled: 0, errors: [] };
  } else {
    return { fetched: 0, inserted: 0, updated: 0, unchanged: 0, cancelled: 0, errors: [`Connector-Typ '${source.connector_type}' nicht implementiert`] };
  }

  // Bestehende Termine laden (nur zukuenftige)
  const today = new Date().toISOString().split("T")[0];
  const { data: existing } = await supabase
    .from("waste_collection_dates")
    .select("id, waste_type, collection_date, notes, time_hint")
    .eq("area_id", area.id)
    .gte("collection_date", today);

  const existingMap = new Map(
    (existing || []).map((d) => [`${d.waste_type}:${d.collection_date}`, d])
  );

  // Nur zukuenftige Termine aus den Raw-Daten
  const futureDates = rawDates.filter((d) => d.collection_date >= today);

  const incomingMap = new Map(
    futureDates.map((d) => [`${d.waste_type}:${d.collection_date}`, d])
  );

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  // Neue und geaenderte Termine
  for (const raw of futureDates) {
    const key = `${raw.waste_type}:${raw.collection_date}`;
    const ex = existingMap.get(key);

    if (!ex) {
      // Neuer Termin
      const { error } = await supabase.from("waste_collection_dates").insert({
        source_id: source.id,
        area_id: area.id,
        waste_type: raw.waste_type,
        collection_date: raw.collection_date,
        notes: raw.notes,
        time_hint: raw.time_hint,
        sync_batch_id: batchId,
        raw_data: { summary: raw.raw_summary },
      });
      if (error) {
        errors.push(`Insert ${key}: ${error.message}`);
      } else {
        inserted++;
      }
    } else if (ex.notes !== raw.notes || ex.time_hint !== raw.time_hint) {
      // Geaenderter Termin
      await supabase
        .from("waste_collection_dates")
        .update({
          notes: raw.notes,
          time_hint: raw.time_hint,
          sync_batch_id: batchId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ex.id);
      updated++;
    } else {
      unchanged++;
    }
  }

  // Weggefallene Termine markieren (nur wenn wir ueberhaupt Daten haben)
  let cancelled = 0;
  if (futureDates.length > 0) {
    for (const [key, ex] of existingMap) {
      if (!incomingMap.has(key)) {
        await supabase
          .from("waste_collection_dates")
          .update({
            is_cancelled: true,
            sync_batch_id: batchId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ex.id);
        cancelled++;
      }
    }
  }

  return {
    fetched: futureDates.length,
    inserted,
    updated,
    unchanged,
    cancelled,
    errors,
  };
}
