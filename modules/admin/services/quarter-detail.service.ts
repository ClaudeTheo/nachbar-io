// Nachbar.io — Service: Quartier-Detail, Update, Archivierung
// Extrahiert aus app/api/admin/quarters/[id]/route.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";

/**
 * Einzelnes Quartier mit aggregierten Stats laden.
 */
export async function getQuarterDetail(
  adminDb: SupabaseClient,
  quarterId: string
) {
  const { data: quarter, error } = await adminDb
    .from("quarters")
    .select("*")
    .eq("id", quarterId)
    .single();

  if (error || !quarter) {
    throw new ServiceError("Quartier nicht gefunden", 404);
  }

  // Stats aggregieren
  const [households, residents, alerts, activeAlerts] = await Promise.all([
    adminDb
      .from("households")
      .select("*", { count: "exact", head: true })
      .eq("quarter_id", quarterId),
    // Bewohner über household_members zählen (users hat kein quarter_id)
    adminDb
      .from("household_members")
      .select("*, households!inner(quarter_id)", { count: "exact", head: true })
      .eq("households.quarter_id", quarterId),
    // Alerts im Quartier (letzte 24h)
    adminDb
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .eq("quarter_id", quarterId)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    // Alle aktiven Alerts im Quartier
    adminDb
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .eq("quarter_id", quarterId)
      .eq("status", "active"),
  ]);

  return {
    ...quarter,
    stats: {
      householdCount: households.count ?? 0,
      residentCount: residents.count ?? 0,
      activeAlerts: alerts.count ?? 0,
      activePosts: activeAlerts.count ?? 0,
    },
  };
}

/**
 * Erlaubte Quartier-Felder aktualisieren (inkl. Status-Transitions-Validierung).
 */
export async function updateQuarter(
  adminDb: SupabaseClient,
  quarterId: string,
  body: Record<string, unknown>
) {
  // Erlaubte Felder für Update
  const allowedFields = [
    "name", "city", "state", "description", "settings", "map_config",
    "status", "invite_prefix", "max_households", "contact_email",
    "center_lat", "center_lng", "zoom_level",
    "bounds_sw_lat", "bounds_sw_lng", "bounds_ne_lat", "bounds_ne_lng",
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw new ServiceError("Keine Felder zum Aktualisieren", 400);
  }

  // Status-Transitionen validieren
  if (updateData.status) {
    const { data: current } = await adminDb
      .from("quarters")
      .select("status")
      .eq("id", quarterId)
      .single();

    if (current) {
      const validTransitions: Record<string, string[]> = {
        draft: ["active"],
        active: ["archived"],
        archived: [], // Kein Zurück
      };
      const allowed = validTransitions[current.status] ?? [];
      if (!allowed.includes(updateData.status as string)) {
        throw new ServiceError(
          `Status-Übergang von '${current.status}' nach '${updateData.status}' nicht erlaubt`,
          400
        );
      }
    }
  }

  updateData.updated_at = new Date().toISOString();

  const { data: updated, error } = await adminDb
    .from("quarters")
    .update(updateData)
    .eq("id", quarterId)
    .select()
    .single();

  if (error) {
    throw new ServiceError("Vorgang fehlgeschlagen", 500);
  }

  return updated;
}

/**
 * Soft-Delete: Quartier auf Status 'archived' setzen (KEIN Hard-Delete).
 */
export async function archiveQuarter(
  adminDb: SupabaseClient,
  quarterId: string
) {
  const { data: updated, error } = await adminDb
    .from("quarters")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", quarterId)
    .select()
    .single();

  if (error) {
    throw new ServiceError("Vorgang fehlgeschlagen", 500);
  }

  return updated;
}
