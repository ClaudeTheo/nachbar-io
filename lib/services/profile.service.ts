// Nachbar.io — Profil-Service
// Zentralisiert alle Supabase-Operationen fuer die Tabelle "users".
// Client-seitig: createClient(). Server-seitig: SupabaseClient als Parameter.

import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User, UserUiMode } from "@/lib/supabase/types";

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

/** UI-Modus wechseln (active ↔ senior). */
export async function toggleUiMode(userId: string, currentMode: UserUiMode): Promise<UserUiMode> {
  const newMode: UserUiMode = currentMode === "active" ? "senior" : "active";
  await updateProfile(userId, { ui_mode: newMode });
  return newMode;
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
