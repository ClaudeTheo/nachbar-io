// Nachbar.io — Circle Events Service: Termine im Familienkreis
// Migration 155, Tasks E-2..E-4

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "./service-error";

export interface CircleEvent {
  id: string;
  resident_id: string;
  created_by: string;
  scheduled_at: string;
  title: string;
  who_comes: string;
  description: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface CreateEventInput {
  residentId: string;
  scheduledAt: string;
  title: string;
  whoComes: string;
  description?: string;
}

/** Termin im Familienkreis erstellen */
export async function createCircleEvent(
  supabase: SupabaseClient,
  userId: string,
  input: CreateEventInput,
): Promise<CircleEvent> {
  if (!input.title.trim()) {
    throw new ServiceError("Titel darf nicht leer sein", 400);
  }

  const { data, error } = await supabase
    .from("circle_events")
    .insert({
      resident_id: input.residentId,
      created_by: userId,
      scheduled_at: input.scheduledAt,
      title: input.title.trim(),
      who_comes: input.whoComes,
      description: input.description || null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new ServiceError("Termin konnte nicht erstellt werden", 500);
  }

  return data as CircleEvent;
}

/** Naechste Termine eines Bewohners (nicht geloescht, ab jetzt) */
export async function listUpcoming(
  supabase: SupabaseClient,
  residentId: string,
): Promise<CircleEvent[]> {
  const { data, error } = await supabase
    .from("circle_events")
    .select()
    .eq("resident_id", residentId)
    .is("deleted_at", null)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true });

  if (error) {
    throw new ServiceError("Termine konnten nicht geladen werden", 500);
  }

  return (data ?? []) as CircleEvent[];
}

/** Termin als erledigt markieren (soft-delete) */
export async function markAsDone(
  supabase: SupabaseClient,
  eventId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("circle_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("created_by", userId);

  if (error) {
    throw new ServiceError("Termin konnte nicht geloescht werden", 500);
  }
}
