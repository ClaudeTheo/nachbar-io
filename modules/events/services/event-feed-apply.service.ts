// modules/events/services/event-feed-apply.service.ts
// Welle W10-Persist — Apply-Service: schreibt validierte CrawledEvent[] in
// municipal_config.crawled_events. Komplementaer zur Crawl-Route (W10) wie
// Welle I (Apply) Pendant zu Welle H (Discover) ist.
//
// Persistenz erfordert Migration 190 (file-only bis Founder-Apply).

import type { SupabaseClient } from "@supabase/supabase-js";

export interface CrawledEventInput {
  source: "rss" | "ical";
  feedUrl: string;
  uid: string | null;
  title: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string | null;
  link: string | null;
  isAllDay: boolean;
}

export interface ApplyCrawledEventsResult {
  savedCount: number;
  syncedAt: string;
}

const MAX_EVENTS = 100;

function isValid(event: CrawledEventInput): boolean {
  if (typeof event?.title !== "string" || event.title.trim().length === 0) {
    return false;
  }
  if (
    typeof event?.startDate !== "string" ||
    event.startDate.trim().length === 0
  ) {
    return false;
  }
  return true;
}

export async function applyCrawledEventsForQuarter(
  supabase: SupabaseClient,
  quarterId: string,
  events: CrawledEventInput[],
): Promise<ApplyCrawledEventsResult> {
  if (!Array.isArray(events)) {
    throw new Error("events muss ein Array sein.");
  }
  if (events.length > MAX_EVENTS) {
    throw new Error(
      `Zu viele Events (${events.length}) — max ${MAX_EVENTS} erlaubt.`,
    );
  }

  const validated = events.filter(isValid);
  const syncedAt = new Date().toISOString();

  const payload = {
    crawled_events: validated,
    crawled_events_synced_at: syncedAt,
  } as Record<string, unknown>;

  const { error } = await supabase
    .from("municipal_config")
    .update(payload)
    .eq("quarter_id", quarterId);

  if (error) {
    const errAny = error as { message?: string };
    throw new Error(errAny?.message ?? String(error));
  }

  return { savedCount: validated.length, syncedAt };
}
