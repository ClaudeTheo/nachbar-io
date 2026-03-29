// Nachbar Hilfe — Kern-Service fuer Budget, Bundesland-Regeln und Helfer
// Extrahierte Business-Logik aus /api/hilfe/budget, /api/hilfe/federal-states, /api/hilfe/helpers

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import {
  getAllStates,
  validateHelperAge,
  isStateAvailable,
  getStateRules,
} from "@/modules/hilfe/services/federal-states";
import type { BudgetSummary } from "@/modules/hilfe/services/types";

// Monatliches Budget nach § 45b SGB XI: 125 EUR + 6 EUR Eigenanteil-Reserve = 131 EUR
const MONTHLY_BUDGET_CENTS = 13100;

// --- Budget ---

/** Budget-Zusammenfassung fuer den aktuellen Monat berechnen */
export async function getBudgetSummary(
  supabase: SupabaseClient,
): Promise<BudgetSummary> {
  // Aktuellen Monat bestimmen (erster und letzter Tag)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  // Sessions des aktuellen Monats laden (ueber help_matches verknuepft)
  // RLS sorgt dafuer, dass nur eigene Sessions zurueckgegeben werden
  const { data: sessions, error } = await supabase
    .from("help_sessions")
    .select("total_amount_cents")
    .gte("session_date", monthStart)
    .lte("session_date", monthEnd);

  if (error) {
    console.error("[hilfe/budget] Sessions laden fehlgeschlagen:", error);
    throw new ServiceError("Budget konnte nicht berechnet werden", 500);
  }

  const sessionList = sessions ?? [];
  const usedThisMonth = sessionList.reduce(
    (sum: number, s: { total_amount_cents: number }) =>
      sum + (s.total_amount_cents ?? 0),
    0,
  );
  const sessionsThisMonth = sessionList.length;
  const availableCents = MONTHLY_BUDGET_CENTS - usedThisMonth;

  return {
    monthly_budget_cents: MONTHLY_BUDGET_CENTS,
    used_this_month_cents: usedThisMonth,
    available_cents: availableCents,
    carry_over_cents: 0, // Vereinfacht: Uebertrag wird spaeter implementiert
    sessions_this_month: sessionsThisMonth,
  };
}

// --- Bundesland-Regeln ---

/** Alle Bundesland-Regeln zurueckgeben (oeffentlich, keine Auth noetig) */
export function listFederalStates() {
  return getAllStates();
}

// --- Helfer ---

/** Verifizierte Helfer auflisten, optional nach Quartier gefiltert */
export async function listHelpers(
  supabase: SupabaseClient,
  params: { quarterId?: string | null },
) {
  let query = supabase
    .from("neighborhood_helpers")
    .select("*")
    .eq("verified", true)
    .order("created_at", { ascending: false });

  if (params.quarterId) {
    // Helfer nach Quartier filtern (via user -> quarter Zuordnung)
    query = query.eq("quarter_id", params.quarterId);
  }

  const { data, error } = await query;
  if (error) {
    throw new ServiceError("Helfer konnten nicht geladen werden", 500);
  }

  return data ?? [];
}

/** Registrierungs-Daten fuer einen neuen Helfer */
export interface RegisterHelperInput {
  federal_state?: string;
  date_of_birth?: string;
  hourly_rate_cents?: number;
  certification_url?: string | null;
  relationship_check?: boolean;
  household_check?: boolean;
}

/** Als Nachbarschaftshelfer registrieren (Upsert auf user_id) */
export async function registerHelper(
  supabase: SupabaseClient,
  userId: string,
  input: RegisterHelperInput,
) {
  const {
    federal_state,
    date_of_birth,
    hourly_rate_cents,
    certification_url,
    relationship_check,
    household_check,
  } = input;

  // Pflichtfelder pruefen
  if (!federal_state) {
    throw new ServiceError("Bundesland ist erforderlich", 400);
  }

  if (!date_of_birth) {
    throw new ServiceError("Geburtsdatum ist erforderlich", 400);
  }

  if (hourly_rate_cents === undefined || hourly_rate_cents === null) {
    throw new ServiceError("Stundensatz ist erforderlich", 400);
  }

  // Bundesland-Verfuegbarkeit pruefen
  if (!isStateAvailable(federal_state)) {
    throw new ServiceError(
      "In Bremen ist die Nachbarschaftshilfe derzeit nicht über die Pflegekasse abrechenbar.",
      400,
    );
  }

  // Mindestalter pruefen
  if (!validateHelperAge(federal_state, new Date(date_of_birth))) {
    throw new ServiceError(
      "Sie müssen mindestens 16 Jahre alt sein, um sich als Helfer zu registrieren.",
      400,
    );
  }

  // Beziehungs- und Haushaltspruefung
  if (!relationship_check) {
    throw new ServiceError(
      "Die Bestätigung zur Beziehungsprüfung ist erforderlich.",
      400,
    );
  }

  if (!household_check) {
    throw new ServiceError(
      "Die Bestätigung zur Haushaltsprüfung ist erforderlich.",
      400,
    );
  }

  // Schulungsnachweis pruefen (landesspezifisch)
  const stateRules = getStateRules(federal_state);
  if (stateRules?.training_required && !certification_url) {
    throw new ServiceError(
      "Ein Schulungsnachweis ist in Ihrem Bundesland erforderlich. Bitte laden Sie Ihr Zertifikat hoch.",
      400,
    );
  }

  // Upsert auf user_id — ermoeglicht erneute Registrierung nach Aenderung
  const { data: helper, error: upsertError } = await supabase
    .from("neighborhood_helpers")
    .upsert(
      {
        user_id: userId,
        federal_state,
        date_of_birth,
        hourly_rate_cents,
        certification_url: certification_url ?? null,
        relationship_check,
        household_check,
        terms_accepted_at: new Date().toISOString(),
        verified: false,
        active_client_count: 0,
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (upsertError || !helper) {
    console.error("[hilfe/helpers] Registrierung fehlgeschlagen:", upsertError);
    throw new ServiceError("Registrierung fehlgeschlagen", 500);
  }

  return helper;
}
