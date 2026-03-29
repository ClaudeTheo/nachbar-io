// Nachbar.io — Service: Quartier-Admin-Verwaltung
// Extrahiert aus app/api/admin/quarters/[id]/admins/route.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";

/**
 * Alle Admins eines Quartiers laden (inkl. User-Infos).
 */
export async function listQuarterAdmins(
  adminDb: SupabaseClient,
  quarterId: string
) {
  const { data: admins, error } = await adminDb
    .from("quarter_admins")
    .select("id, quarter_id, user_id, assigned_at, assigned_by")
    .eq("quarter_id", quarterId);

  if (error) {
    throw new ServiceError("Vorgang fehlgeschlagen", 500);
  }

  // User-Infos separat laden (kein FK-Join über Service-Client möglich)
  const userIds = (admins ?? []).map((a) => a.user_id);
  const { data: users } = userIds.length > 0
    ? await adminDb
        .from("users")
        .select("id, display_name, email_hash")
        .in("id", userIds)
    : { data: [] };

  const usersMap = new Map((users ?? []).map((u) => [u.id, u]));

  return (admins ?? []).map((a) => ({
    ...a,
    user: usersMap.get(a.user_id) ?? null,
  }));
}

/**
 * Benutzer als Quartier-Admin zuweisen.
 */
export async function assignQuarterAdmin(
  adminDb: SupabaseClient,
  quarterId: string,
  userId: string,
  assignedBy: string
) {
  // Prüfen ob Quartier existiert
  const { data: quarter } = await adminDb
    .from("quarters")
    .select("id")
    .eq("id", quarterId)
    .single();
  if (!quarter) {
    throw new ServiceError("Quartier nicht gefunden", 404);
  }

  // Prüfen ob User existiert
  const { data: targetUser } = await adminDb
    .from("users")
    .select("id, role")
    .eq("id", userId)
    .single();
  if (!targetUser) {
    throw new ServiceError("Benutzer nicht gefunden", 404);
  }

  // Prüfen ob bereits zugewiesen
  const { data: existing } = await adminDb
    .from("quarter_admins")
    .select("id")
    .eq("quarter_id", quarterId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    throw new ServiceError("Benutzer ist bereits Admin dieses Quartiers", 409);
  }

  // Quarter-Admin Eintrag erstellen
  const { data: created, error } = await adminDb
    .from("quarter_admins")
    .insert({
      quarter_id: quarterId,
      user_id: userId,
      assigned_by: assignedBy,
    })
    .select()
    .single();

  if (error) {
    throw new ServiceError("Vorgang fehlgeschlagen", 500);
  }

  // Rolle auf quarter_admin setzen wenn aktuell nur 'user'
  if (targetUser.role === "user") {
    await adminDb
      .from("users")
      .update({ role: "quarter_admin" })
      .eq("id", userId);
  }

  return created;
}

/**
 * Quartier-Admin entfernen und ggf. Rolle zurücksetzen.
 */
export async function removeQuarterAdmin(
  adminDb: SupabaseClient,
  quarterId: string,
  userId: string
) {
  // Quarter-Admin Eintrag löschen
  const { error } = await adminDb
    .from("quarter_admins")
    .delete()
    .eq("quarter_id", quarterId)
    .eq("user_id", userId);

  if (error) {
    throw new ServiceError("Vorgang fehlgeschlagen", 500);
  }

  // Prüfen ob User noch andere Quarter-Admin-Zuweisungen hat
  const { count } = await adminDb
    .from("quarter_admins")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Wenn keine weiteren Zuweisungen, Rolle auf 'user' zurücksetzen
  if ((count ?? 0) === 0) {
    const { data: userProfile } = await adminDb
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    // Nur zurücksetzen wenn nicht super_admin
    if (userProfile?.role === "quarter_admin") {
      await adminDb
        .from("users")
        .update({ role: "user" })
        .eq("id", userId);
    }
  }
}
