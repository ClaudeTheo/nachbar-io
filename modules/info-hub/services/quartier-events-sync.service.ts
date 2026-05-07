// Quartier-Events-Sync: projiziert vorhandene Events in municipal_config.events.

import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import type { LocalEvent } from "@/modules/info-hub/types";

export interface QuartierEventsSyncResult {
  message: string;
  requestId: string;
  quarters: number;
  updated: number;
  events: number;
  errors: number;
}

export interface SyncedQuartierEvent extends LocalEvent {
  [key: string]: unknown;
  source: "events-table";
  eventId: string;
  syncedAt?: string;
}

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  end_time: string | null;
  location: string | null;
  category: string;
}

interface MunicipalConfigRow {
  events?: unknown;
  sync_meta?: unknown;
}

interface MunicipalConfigSyncMeta {
  events?: EventSyncMeta;
  [key: string]: unknown;
}

interface EventSyncMeta {
  status: "ok" | "error";
  source: "events-table";
  last_synced_at: string;
  found_count: number;
  written_count: number;
  manual_preserved_count: number;
  error: string | null;
}

export function mapEventRowToLocalEvent(
  row: EventRow,
  syncedAt: string,
): SyncedQuartierEvent {
  return {
    title: row.title,
    description: row.description?.trim() || "Quartier-Termin",
    schedule: formatSchedule(row),
    location: row.location?.trim() || "Ort wird noch bekanntgegeben",
    icon: iconForCategory(row.category),
    source: "events-table",
    eventId: row.id,
    syncedAt,
  };
}

export function mergeQuartierEvents(
  existing: Array<LocalEvent & Record<string, unknown>>,
  synced: SyncedQuartierEvent[],
): Array<LocalEvent & Record<string, unknown>> {
  const manual = existing.filter((event) => !isAutoSynced(event));
  const manualTitles = new Set(manual.map((event) => normalize(event.title)));
  const merged = [...manual];

  for (const event of synced) {
    if (manualTitles.has(normalize(event.title))) continue;
    merged.push(event);
  }

  return merged;
}

export async function runQuartierEventsSync(
  supabase: SupabaseClient,
  options: { now?: () => Date; today?: string } = {},
): Promise<QuartierEventsSyncResult> {
  const requestId = randomUUID();
  const now = options.now ?? (() => new Date());
  const today = options.today ?? now().toISOString().slice(0, 10);
  const result = {
    message: "Quartier-Events-Sync abgeschlossen",
    requestId,
    quarters: 0,
    updated: 0,
    events: 0,
    errors: 0,
  };

  const { data: quarters, error: quartersError } = await supabase
    .from("quarters")
    .select("id, name")
    .eq("status", "active");

  if (quartersError || !quarters?.length) {
    result.errors++;
    return result;
  }

  result.quarters = quarters.length;

  for (const quarter of quarters) {
    let config: MunicipalConfigRow | null = null;

    try {
      const { data: configData, error: configError } = await supabase
        .from("municipal_config")
        .select("events, sync_meta")
        .eq("quarter_id", quarter.id)
        .single();

      if (configError || !configData) {
        result.errors++;
        continue;
      }

      config = configData as MunicipalConfigRow;
      const syncedAt = now().toISOString();
      const existingEvents = parseExistingEvents(config.events);
      const manualPreservedCount = countManualEvents(existingEvents);
      const eventRows = await loadUpcomingEvents(supabase, quarter.id, today);
      const syncedEvents = eventRows.map((row) =>
        mapEventRowToLocalEvent(row, syncedAt),
      );
      const events = mergeQuartierEvents(existingEvents, syncedEvents);
      const writtenCount = countAutoSyncedEvents(events);
      const sync_meta = buildSyncMeta(config.sync_meta, {
        status: "ok",
        source: "events-table",
        last_synced_at: syncedAt,
        found_count: eventRows.length,
        written_count: writtenCount,
        manual_preserved_count: manualPreservedCount,
        error: null,
      });

      const { error: updateError } = await supabase
        .from("municipal_config")
        .update({ events, sync_meta, updated_at: syncedAt })
        .eq("quarter_id", quarter.id);

      if (updateError) {
        throw new Error(updateError.message ?? String(updateError));
      }

      result.updated++;
      result.events += writtenCount;
    } catch (error) {
      const syncedAt = now().toISOString();
      const errorMessage = toErrorMessage(error);
      console.error(
        JSON.stringify({
          requestId,
          event: "quartier_events_sync_error",
          quarter_id: quarter.id,
          error: errorMessage,
        }),
      );

      if (config) {
        await writeEventSyncError(
          supabase,
          quarter.id,
          config,
          syncedAt,
          errorMessage,
        );
      }

      result.errors++;
    }
  }

  return result;
}

async function loadUpcomingEvents(
  supabase: SupabaseClient,
  quarterId: string,
  today: string,
): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, description, event_date, event_time, end_time, location, category",
    )
    .eq("quarter_id", quarterId)
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(8);

  if (error) {
    throw new Error(error.message ?? String(error));
  }

  return Array.isArray(data) ? (data as EventRow[]) : [];
}

function formatSchedule(row: EventRow): string {
  const date = formatGermanDate(row.event_date);
  const start = formatTime(row.event_time);
  const end = formatTime(row.end_time);

  if (start && end) return `${date}, ${start}-${end} Uhr`;
  if (start) return `${date}, ${start} Uhr`;
  return date;
}

function formatGermanDate(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function formatTime(value: string | null): string | null {
  return value?.slice(0, 5) || null;
}

function iconForCategory(category: string): string {
  switch (category) {
    case "market":
      return "shopping-bag";
    case "sports":
      return "activity";
    case "kids":
      return "smile";
    case "seniors":
      return "heart-handshake";
    case "cleanup":
      return "leaf";
    case "community":
      return "users";
    case "culture":
      return "music";
    default:
      return "calendar";
  }
}

function isAutoSynced(event: Record<string, unknown>): boolean {
  return event.source === "events-table" || typeof event.eventId === "string";
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("de-DE");
}

function parseExistingEvents(
  value: unknown,
): Array<LocalEvent & Record<string, unknown>> {
  return Array.isArray(value)
    ? (value as Array<LocalEvent & Record<string, unknown>>)
    : [];
}

function countManualEvents(
  events: Array<LocalEvent & Record<string, unknown>>,
): number {
  return events.filter((event) => !isAutoSynced(event)).length;
}

function countAutoSyncedEvents(
  events: Array<LocalEvent & Record<string, unknown>>,
): number {
  return events.filter(isAutoSynced).length;
}

function buildSyncMeta(
  value: unknown,
  events: EventSyncMeta,
): MunicipalConfigSyncMeta {
  const base =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return { ...base, events };
}

async function writeEventSyncError(
  supabase: SupabaseClient,
  quarterId: string,
  config: MunicipalConfigRow,
  syncedAt: string,
  error: string,
): Promise<void> {
  const existingEvents = parseExistingEvents(config.events);
  const sync_meta = buildSyncMeta(config.sync_meta, {
    status: "error",
    source: "events-table",
    last_synced_at: syncedAt,
    found_count: 0,
    written_count: 0,
    manual_preserved_count: countManualEvents(existingEvents),
    error,
  });

  const { error: updateError } = await supabase
    .from("municipal_config")
    .update({ sync_meta, updated_at: syncedAt })
    .eq("quarter_id", quarterId);

  if (updateError) {
    console.error(
      JSON.stringify({
        event: "quartier_events_sync_meta_error",
        quarter_id: quarterId,
        error: updateError.message ?? String(updateError),
      }),
    );
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
