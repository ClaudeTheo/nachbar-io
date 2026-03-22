// Nachbar.io — Alerts-Service
// Zentralisiert alle Supabase-Operationen fuer die Tabellen "alerts" und "alert_responses".

import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Alert, AlertCategory, AlertStatus, AlertResponse, LocationSource } from "@/lib/supabase/types";

// Standard-Select mit Joins (User + Household + Responses)
const ALERT_SELECT_WITH_RELATIONS =
  "*, user:users(display_name, avatar_url), household:households(street_name, house_number, lat, lng), responses:alert_responses(*, responder:users(display_name, avatar_url))";

// ============================================================
// Typen fuer Insert-Parameter
// ============================================================

export interface CreateAlertParams {
  userId: string;
  householdId: string;
  quarterId: string;
  category: AlertCategory;
  title: string;
  description?: string | null;
  isEmergency?: boolean;
  locationLat?: number | null;
  locationLng?: number | null;
  locationSource?: LocationSource;
}

// ============================================================
// Client-seitige Funktionen
// ============================================================

/** Alle Alerts eines Quartiers laden (mit Relationen, neueste zuerst). */
export async function getAlertsByQuarter(
  quarterId: string,
  options?: { limit?: number; status?: AlertStatus }
): Promise<Alert[]> {
  const supabase = createClient();
  let query = supabase
    .from("alerts")
    .select(ALERT_SELECT_WITH_RELATIONS)
    .eq("quarter_id", quarterId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Alert[];
}

/** Einzelnen Alert laden (mit Relationen). */
export async function getAlertById(alertId: string): Promise<Alert> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("alerts")
    .select(ALERT_SELECT_WITH_RELATIONS)
    .eq("id", alertId)
    .single();
  if (error) throw error;
  return data as unknown as Alert;
}

/** Neuen Alert erstellen. */
export async function createAlert(params: CreateAlertParams): Promise<Alert> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("alerts")
    .insert({
      user_id: params.userId,
      household_id: params.householdId,
      quarter_id: params.quarterId,
      category: params.category,
      title: params.title,
      description: params.description ?? null,
      status: "open" as AlertStatus,
      is_emergency: params.isEmergency ?? false,
      current_radius: 1,
      location_lat: params.locationLat ?? null,
      location_lng: params.locationLng ?? null,
      location_source: params.locationSource ?? "none",
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Alert;
}

/** Hilfe-Antwort auf einen Alert erstellen. */
export async function respondToAlert(
  alertId: string,
  responderId: string,
  responseType: AlertResponse["response_type"] = "help",
  message?: string | null
): Promise<void> {
  const supabase = createClient();

  // Antwort einfuegen
  const { error: respErr } = await supabase.from("alert_responses").insert({
    alert_id: alertId,
    responder_user_id: responderId,
    response_type: responseType,
    message: message ?? null,
  });
  if (respErr) throw respErr;

  // Status aktualisieren
  const newStatus: AlertStatus = responseType === "resolved" ? "resolved" : "help_coming";
  const { error: updErr } = await supabase
    .from("alerts")
    .update({ status: newStatus })
    .eq("id", alertId);
  if (updErr) throw updErr;
}

/** Alert-Status aktualisieren. */
export async function updateAlertStatus(alertId: string, status: AlertStatus): Promise<void> {
  const supabase = createClient();
  const updateData: Record<string, unknown> = { status };
  if (status === "resolved") {
    updateData.resolved_at = new Date().toISOString();
  }
  const { error } = await supabase.from("alerts").update(updateData).eq("id", alertId);
  if (error) throw error;
}

// ============================================================
// Server-seitige Funktionen
// ============================================================

/** Alerts eines Quartiers laden (Server-Variante). */
export async function getAlertsByQuarterServer(
  supabase: SupabaseClient,
  quarterId: string,
  options?: { limit?: number; status?: AlertStatus }
): Promise<Alert[]> {
  let query = supabase
    .from("alerts")
    .select(ALERT_SELECT_WITH_RELATIONS)
    .eq("quarter_id", quarterId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Alert[];
}

/** Alert erstellen (Server-Variante). */
export async function createAlertServer(
  supabase: SupabaseClient,
  params: CreateAlertParams
): Promise<Alert> {
  const { data, error } = await supabase
    .from("alerts")
    .insert({
      user_id: params.userId,
      household_id: params.householdId,
      quarter_id: params.quarterId,
      category: params.category,
      title: params.title,
      description: params.description ?? null,
      status: "open" as AlertStatus,
      is_emergency: params.isEmergency ?? false,
      current_radius: 1,
      location_lat: params.locationLat ?? null,
      location_lng: params.locationLng ?? null,
      location_source: params.locationSource ?? "none",
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Alert;
}
