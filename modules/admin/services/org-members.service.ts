// Nachbar.io — Service: Org-Mitglieder (auflisten, hinzufuegen, entfernen, Rolle aendern)
// Extrahiert aus app/api/organizations/[id]/members/route.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { validateOrgMemberAdd } from "@/lib/organizations";

/**
 * Mitglieder einer Organisation auflisten (inkl. User-Details).
 */
export async function listMembers(serviceDb: SupabaseClient, orgId: string) {
  // Mitglieder laden
  const { data: members, error } = await serviceDb
    .from("org_members")
    .select("id, org_id, user_id, role, assigned_quarters, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[organizations/members] GET Fehler:", error);
    throw new ServiceError("Mitglieder konnten nicht geladen werden", 500);
  }

  // User-Details separat laden
  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: users } =
    userIds.length > 0
      ? await serviceDb
          .from("users")
          .select("id, display_name, email_hash")
          .in("id", userIds)
      : { data: [] };

  const usersMap = new Map((users ?? []).map((u) => [u.id, u]));

  return (members ?? []).map((m) => ({
    ...m,
    user: usersMap.get(m.user_id) ?? null,
  }));
}

/**
 * Mitglied zur Organisation hinzufuegen.
 * Prueft: Org existiert, User existiert, nicht bereits Mitglied.
 */
export async function addMember(
  serviceDb: SupabaseClient,
  orgId: string,
  userId: string,
  body: Record<string, unknown>,
) {
  // Validierung
  const validation = validateOrgMemberAdd(body);
  if (!validation.valid) {
    throw new ServiceError(validation.error ?? "Validierungsfehler", 400);
  }

  // Pruefen ob Organisation existiert
  const { data: orgData } = await serviceDb
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .single();

  if (!orgData) {
    throw new ServiceError("Organisation nicht gefunden", 404);
  }

  // Pruefen ob User existiert
  const { data: targetUser } = await serviceDb
    .from("users")
    .select("id")
    .eq("id", body.user_id as string)
    .single();

  if (!targetUser) {
    throw new ServiceError("Benutzer nicht gefunden", 404);
  }

  // Pruefen ob bereits Mitglied
  const { data: existing } = await serviceDb
    .from("org_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", body.user_id as string)
    .maybeSingle();

  if (existing) {
    throw new ServiceError(
      "Benutzer ist bereits Mitglied dieser Organisation",
      409,
    );
  }

  // Mitglied hinzufuegen
  const { data: member, error: insertError } = await serviceDb
    .from("org_members")
    .insert({
      org_id: orgId,
      user_id: body.user_id as string,
      role: body.role as string,
      assigned_quarters: (body.assigned_quarters as string[]) ?? [],
    })
    .select()
    .single();

  if (insertError || !member) {
    console.error("[organizations/members] POST Insert-Fehler:", insertError);
    throw new ServiceError("Mitglied konnte nicht hinzugefuegt werden", 500);
  }

  // Audit-Log
  await serviceDb.from("org_audit_log").insert({
    org_id: orgId,
    user_id: userId,
    action: "member_added",
    target_user_id: body.user_id as string,
    details: { role: body.role },
  });

  return member;
}
