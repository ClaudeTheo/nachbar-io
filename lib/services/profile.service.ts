// Nachbar.io — Profil-Service
// Zentralisiert alle Supabase-Operationen fuer die Tabelle "users".
// Client-seitig: createClient(). Server-seitig: SupabaseClient als Parameter.

import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User, UserUiMode } from "@/lib/supabase/types";
import { isUserUiMode } from "@/lib/user-modes";
import { ServiceError } from "@/lib/services/service-error";

// Pilot-Selbstauskunft (W4b-2): die Rollen, die ein Nutzer SELBST im Profil setzen darf.
// Bewusst OHNE "test_user" — das ist ein internes Test-Flag mit Seiteneffekten
// (is_test_user/must_delete_before_pilot), keine Selbst-Auswahl.
export const SELF_SELECTABLE_PILOT_ROLES = ["resident", "caregiver", "helper"] as const;
export type SelfSelectablePilotRole = (typeof SELF_SELECTABLE_PILOT_ROLES)[number];

export function isSelfSelectablePilotRole(value: unknown): value is SelfSelectablePilotRole {
  return (
    typeof value === "string" &&
    (SELF_SELECTABLE_PILOT_ROLES as readonly string[]).includes(value)
  );
}

// ============================================================
// Client-seitige Funktionen (fuer "use client" Komponenten)
// ============================================================

/** Profil eines Nutzers laden (alle Spalten). */
export async function getProfile(userId: string): Promise<User> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data as User;
}

/** Profil-Felder aktualisieren (Partial Update). */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<User, "display_name" | "bio" | "phone" | "avatar_url" | "ui_mode" | "settings">>
): Promise<User> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as User;
}

/** UI-Modus gezielt setzen. */
export async function setUiMode(userId: string, mode: UserUiMode): Promise<UserUiMode> {
  if (!isUserUiMode(mode)) {
    throw new Error("Ungueltiger UI-Modus");
  }
  await updateProfile(userId, { ui_mode: mode });
  return mode;
}

/** Legacy-Umschalter (active ↔ senior). */
export async function toggleUiMode(userId: string, currentMode: UserUiMode): Promise<UserUiMode> {
  const newMode: UserUiMode = currentMode === "active" ? "senior" : "active";
  return setUiMode(userId, newMode);
}

/** Nutzer-Einstellungen aktualisieren (merge in settings-JSONB). */
export async function updateUserSettings(
  userId: string,
  settingsPatch: Record<string, unknown>
): Promise<User> {
  const supabase = createClient();
  // Aktuelle Settings laden, dann mergen
  const { data: current, error: fetchErr } = await supabase
    .from("users")
    .select("settings")
    .eq("id", userId)
    .single();
  if (fetchErr) throw fetchErr;

  const merged = { ...(current?.settings as Record<string, unknown> ?? {}), ...settingsPatch };
  return updateProfile(userId, { settings: merged });
}

// ============================================================
// Server-seitige Funktionen (fuer API Routes / Server Components)
// ============================================================

/** Profil laden (Server-Variante, erwartet fertig initialisierten Supabase-Client). */
export async function getProfileServer(supabase: SupabaseClient, userId: string): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data as User;
}

/** Profil aktualisieren (Server-Variante). */
export async function updateProfileServer(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<Pick<User, "display_name" | "bio" | "phone" | "avatar_url" | "ui_mode" | "settings">>
): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as User;
}

/**
 * Setzt die Pilot-Selbstauskunft (settings.pilot_role) des eingeloggten Nutzers (W4b-2).
 *
 * MUSS mit dem ADMIN-Client (service_role) aufgerufen werden: Mig 198
 * (enforce_user_update_restrictions) listet pilot_role in protected_keys und setzt
 * jeden Client-Schreibversuch still auf den Alt-Wert zurueck. Der service_role-Pfad
 * bypassed den Trigger; die eigentliche Autorisierung leistet der Aufrufer (Route),
 * der userId aus der Cookie-Session ableitet (IDOR-Schutz) — NICHT aus dem Body.
 *
 * Schreibt NUR den pilot_role-Schluessel (Merge erhaelt alle anderen settings-Keys)
 * und protokolliert den Wechsel in der generischen audit_log (nicht-blockierend).
 */
export async function setPilotRoleServer(
  supabase: SupabaseClient,
  userId: string,
  pilotRole: SelfSelectablePilotRole
): Promise<SelfSelectablePilotRole> {
  const { data: current, error: fetchErr } = await supabase
    .from("users")
    .select("settings")
    .eq("id", userId)
    .single();
  if (fetchErr) throw fetchErr;

  const settings = (current?.settings as Record<string, unknown> | null) ?? {};
  const previous = typeof settings.pilot_role === "string" ? settings.pilot_role : null;

  const { error: updateErr } = await supabase
    .from("users")
    .update({ settings: { ...settings, pilot_role: pilotRole } })
    .eq("id", userId);
  if (updateErr) {
    throw new ServiceError(
      "Rolle konnte nicht gespeichert werden",
      500,
      "pilot_role_update_failed"
    );
  }

  // Leichter Audit-Trail (pilot_role ist ein Nicht-Privileg-Label). Fehler blockieren
  // den Hauptprozess nicht, werden aber geloggt.
  const { error: auditErr } = await supabase.from("audit_log").insert({
    action: "pilot_role_self_updated",
    actor_id: userId,
    target_type: "user",
    target_id: userId,
    metadata: { from: previous, to: pilotRole },
  });
  if (auditErr) {
    console.error("[profile] pilot_role-Audit fehlgeschlagen:", auditErr.message);
  }

  return pilotRole;
}
