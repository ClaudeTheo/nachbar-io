// Nachbar Hilfe — Request-Service fuer Hilfe-Gesuche und Helfer-Matching
// Extrahierte Business-Logik aus /api/hilfe/requests und /api/hilfe/requests/[id]/match

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import type { HelpCategory, HelpRequestType } from "@/modules/hilfe/services/types";
import { HELP_CATEGORY_LABELS } from "@/modules/hilfe/services/types";

const VALID_CATEGORIES = Object.keys(HELP_CATEGORY_LABELS) as HelpCategory[];

// --- Hilfe-Gesuche auflisten ---

/** Offene Hilfe-Gesuche laden, optional gefiltert nach Quartier */
export async function listRequests(
  supabase: SupabaseClient,
  _userId: string,
  quarterId?: string | null,
) {
  let query = supabase
    .from("help_requests")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (quarterId) {
    query = query.eq("quarter_id", quarterId);
  }

  const { data, error } = await query;

  if (error) {
    throw new ServiceError("Hilfe-Gesuche konnten nicht geladen werden", 500);
  }

  return data ?? [];
}

// --- Hilfe-Gesuch erstellen ---

/** Neues Hilfe-Gesuch erstellen mit Validierung */
export async function createRequest(
  supabase: SupabaseClient,
  userId: string,
  input: {
    quarter_id?: string;
    category?: string;
    title?: string;
    description?: string | null;
    type?: HelpRequestType;
  },
) {
  const { quarter_id, category, title, description, type } = input;

  // Pflichtfeld: quarter_id
  if (!quarter_id) {
    throw new ServiceError("quarter_id ist erforderlich", 400);
  }

  // Kategorie validieren
  if (!category || !VALID_CATEGORIES.includes(category as HelpCategory)) {
    throw new ServiceError(
      `Ungueltige Kategorie: ${category}. Erlaubt: ${VALID_CATEGORIES.join(", ")}`,
      400,
    );
  }

  // Typ validieren (Standard: "need")
  const requestType: HelpRequestType = type === "offer" ? "offer" : "need";

  // Titel: uebergeben oder aus Kategorie ableiten
  const requestTitle =
    title || HELP_CATEGORY_LABELS[category as HelpCategory] || category;

  const { data: helpRequest, error: insertError } = await supabase
    .from("help_requests")
    .insert({
      user_id: userId,
      quarter_id,
      type: requestType,
      category,
      title: requestTitle,
      description: description ?? null,
      status: "active",
    })
    .select()
    .single();

  if (insertError || !helpRequest) {
    console.error("[hilfe/requests] Erstellen fehlgeschlagen:", insertError);
    throw new ServiceError("Hilfe-Gesuch konnte nicht erstellt werden", 500);
  }

  return helpRequest;
}

// --- Helfer bewirbt sich auf ein Gesuch ---

/** Helfer-Bewerbung auf ein offenes Hilfe-Gesuch speichern */
export async function applyForRequest(
  supabase: SupabaseClient,
  _userId: string,
  requestId: string,
  helperId: string,
) {
  if (!helperId) {
    throw new ServiceError("helper_id ist erforderlich", 400);
  }

  const { data: match, error: insertError } = await supabase
    .from("help_matches")
    .insert({
      request_id: requestId,
      helper_id: helperId,
    })
    .select()
    .single();

  if (insertError || !match) {
    console.error("[hilfe/match] Bewerbung fehlgeschlagen:", insertError);
    throw new ServiceError("Bewerbung konnte nicht gespeichert werden", 500);
  }

  return match;
}

// --- Bewohner bestaetigt einen Match ---

/** Match bestaetigen und Gesuch-Status auf 'matched' setzen */
export async function confirmMatch(
  supabase: SupabaseClient,
  _userId: string,
  requestId: string,
  matchId: string,
) {
  if (!matchId) {
    throw new ServiceError("match_id ist erforderlich", 400);
  }

  // Match bestaetigen: confirmed_at setzen
  const { data: updatedMatch, error: matchError } = await supabase
    .from("help_matches")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", matchId)
    .eq("request_id", requestId)
    .select()
    .single();

  if (matchError || !updatedMatch) {
    console.error("[hilfe/match] Bestätigung fehlgeschlagen:", matchError);
    throw new ServiceError("Match konnte nicht bestätigt werden", 500);
  }

  // Gesuch-Status auf 'matched' setzen
  const { error: statusError } = await supabase
    .from("help_requests")
    .update({ status: "matched" })
    .eq("id", requestId);

  if (statusError) {
    console.error("[hilfe/match] Status-Update fehlgeschlagen:", statusError);
    throw new ServiceError("Status-Update fehlgeschlagen", 500);
  }

  return updatedMatch;
}
