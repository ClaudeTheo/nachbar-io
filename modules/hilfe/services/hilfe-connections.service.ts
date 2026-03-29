// Nachbar Hilfe — Verbindungs-Service fuer Helfer-Senior-Beziehungen
// Extrahierte Business-Logik aus /api/hilfe/connections, /api/hilfe/connections/[id], /api/hilfe/connections/invite

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import {
  generateInviteCode as generateCode,
  isValidInviteCode,
} from "@/modules/hilfe/services/connections";
import { getMaxClients } from "@/modules/hilfe/services/federal-states";

// --- Verbindungen auflisten ---

/** Alle aktiven Verbindungen des Nutzers laden (als Helfer oder Senior) */
export async function listConnections(
  supabase: SupabaseClient,
  userId: string,
) {
  // Helfer-Profil laden fuer beidseitige Suche
  const { data: helperProfile } = await supabase
    .from("neighborhood_helpers")
    .select("id")
    .eq("user_id", userId)
    .single();

  // Verbindungen als Helfer ODER als Senior
  const { data: connections } = await supabase
    .from("helper_connections")
    .select("*")
    .or(
      helperProfile
        ? `helper_id.eq.${helperProfile.id},resident_id.eq.${userId}`
        : `resident_id.eq.${userId}`,
    )
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  return connections || [];
}

// --- Organische Verbindung erstellen ---

/** Organische Verbindung erstellen (Senior bestätigt Match) */
export async function createConnection(
  supabase: SupabaseClient,
  userId: string,
  helperId: string,
) {
  if (!helperId) {
    throw new ServiceError("helper_id erforderlich", 400);
  }

  // Pruefen ob Verbindung schon existiert
  const { data: existing } = await supabase
    .from("helper_connections")
    .select("id")
    .eq("helper_id", helperId)
    .eq("resident_id", userId)
    .is("revoked_at", null)
    .single();

  if (existing) {
    throw new ServiceError("Verbindung besteht bereits", 409);
  }

  // Bundesland-Limit pruefen
  const { data: helper } = await supabase
    .from("neighborhood_helpers")
    .select("federal_state")
    .eq("id", helperId)
    .single();

  if (!helper) {
    throw new ServiceError("Helfer nicht gefunden", 404);
  }

  const { count: activeCount } = await supabase
    .from("helper_connections")
    .select("*", { count: "exact", head: true })
    .eq("helper_id", helperId)
    .is("revoked_at", null)
    .not("confirmed_at", "is", null);

  const maxClients = getMaxClients(helper.federal_state);

  if (maxClients !== null && (activeCount || 0) >= maxClients) {
    throw new ServiceError(
      `Maximale Anzahl an Klienten für ${helper.federal_state} erreicht (${maxClients}). Beenden Sie eine bestehende Verbindung.`,
      403,
    );
  }

  // Verbindung erstellen (unbestätigt, Senior muss bestätigen)
  const { data: connection, error } = await supabase
    .from("helper_connections")
    .insert({
      helper_id: helperId,
      resident_id: userId,
      source: "organic",
    })
    .select()
    .single();

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return connection;
}

// --- Verbindung bestätigen ---

/** Verbindung bestätigen (nur der Senior/resident kann das) */
export async function confirmConnection(
  supabase: SupabaseClient,
  userId: string,
  connectionId: string,
) {
  // Nur der Senior (resident_id) kann bestätigen
  const { data: connection, error } = await supabase
    .from("helper_connections")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", connectionId)
    .eq("resident_id", userId)
    .is("confirmed_at", null)
    .is("revoked_at", null)
    .select()
    .single();

  if (error || !connection) {
    throw new ServiceError(
      "Verbindung nicht gefunden oder bereits bestätigt",
      404,
    );
  }

  return connection;
}

// --- Verbindung widerrufen ---

/** Verbindung widerrufen (beide Seiten koennen widerrufen) */
export async function revokeConnection(
  supabase: SupabaseClient,
  _userId: string,
  connectionId: string,
) {
  const { data: connection, error } = await supabase
    .from("helper_connections")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", connectionId)
    .is("revoked_at", null)
    .select()
    .single();

  if (error || !connection) {
    throw new ServiceError("Verbindung nicht gefunden", 404);
  }

  return { success: true };
}

// --- Einladungs-Code generieren ---

/** Einladungs-Code generieren (Senior laedt Helfer ein) */
export function generateInviteCode(userId: string) {
  const code = generateCode();

  return {
    code,
    resident_id: userId,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

// --- Einladungs-Code einloesen ---

/** Einladungs-Code einloesen (Helfer nimmt Einladung an) */
export async function redeemInviteCode(
  supabase: SupabaseClient,
  userId: string,
  code: string,
  residentId: string,
) {
  if (!code || !residentId) {
    throw new ServiceError("Code und Bewohner-ID erforderlich", 400);
  }

  if (!isValidInviteCode(code)) {
    throw new ServiceError("Ungültiges Code-Format", 400);
  }

  // Helfer-Profil laden
  const { data: helper } = await supabase
    .from("neighborhood_helpers")
    .select("id, federal_state")
    .eq("user_id", userId)
    .single();

  if (!helper) {
    throw new ServiceError("Kein Helfer-Profil gefunden", 404);
  }

  // Bundesland-Limit pruefen
  const { count: activeCount } = await supabase
    .from("helper_connections")
    .select("*", { count: "exact", head: true })
    .eq("helper_id", helper.id)
    .is("revoked_at", null)
    .not("confirmed_at", "is", null);

  const maxClients = getMaxClients(helper.federal_state);
  if (maxClients !== null && (activeCount || 0) >= maxClients) {
    throw new ServiceError(
      `Maximale Anzahl an Klienten erreicht (${maxClients}).`,
      403,
    );
  }

  // Verbindung erstellen (mit Code, aber noch unbestätigt)
  const { data: connection, error } = await supabase
    .from("helper_connections")
    .insert({
      helper_id: helper.id,
      resident_id: residentId,
      source: "invitation",
      invite_code: code,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ServiceError("Verbindung besteht bereits", 409);
    }
    throw new ServiceError(error.message, 500);
  }

  return connection;
}
