import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { getUserQuarterId } from "@/lib/quarters/helpers";
import { awardPoints } from "@/modules/gamification";
import type {
  Group,
  GroupWithMembership,
  GroupMember,
  GroupMemberWithUser,
  CreateGroupPayload,
  UpdateGroupPayload,
  GroupCategory,
} from "./types";
import { GROUP_CATEGORIES } from "./types";

const MAX_GROUPS_PER_QUARTER = 25;
const MAX_GROUPS_PER_USER = 10;

// Mitgliederzahl aktualisieren
async function syncMemberCount(supabase: SupabaseClient, groupId: string) {
  const { count } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId)
    .eq("status", "active");
  await supabase
    .from("groups")
    .update({ member_count: count ?? 0, updated_at: new Date().toISOString() })
    .eq("id", groupId);
}

// Alle Gruppen im Quartier (mit eigener Mitgliedschaft annotiert)
export async function listGroups(
  supabase: SupabaseClient,
  userId: string,
  onlyMine = false,
): Promise<GroupWithMembership[]> {
  const quarterId = await getUserQuarterId(supabase, userId);
  if (!quarterId) throw new ServiceError("Kein Quartier zugeordnet", 403);

  const { data: groups, error } = await supabase
    .from("groups")
    .select("*")
    .eq("quarter_id", quarterId)
    .order("member_count", { ascending: false });

  if (error)
    throw new ServiceError("Gruppen konnten nicht geladen werden", 500);

  // Eigene Mitgliedschaften laden
  const { data: memberships } = await supabase
    .from("group_members")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "pending"]);

  const membershipMap = new Map<string, GroupMember>();
  for (const m of memberships ?? []) {
    membershipMap.set(m.group_id, m);
  }

  const result: GroupWithMembership[] = (groups ?? []).map((g: Group) => ({
    ...g,
    my_membership: membershipMap.get(g.id) ?? null,
  }));

  if (onlyMine) {
    return result.filter((g) => g.my_membership?.status === "active");
  }

  return result;
}

// Einzelne Gruppe laden
export async function getGroup(
  supabase: SupabaseClient,
  groupId: string,
): Promise<Group> {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (error || !data) throw new ServiceError("Gruppe nicht gefunden", 404);
  return data;
}

// Gruppe erstellen (Ersteller wird automatisch Gruender)
export async function createGroup(
  supabase: SupabaseClient,
  userId: string,
  payload: CreateGroupPayload,
): Promise<Group> {
  const quarterId = await getUserQuarterId(supabase, userId);
  if (!quarterId) throw new ServiceError("Kein Quartier zugeordnet", 403);

  // Validierung
  if (!payload.name || payload.name.length < 3 || payload.name.length > 60) {
    throw new ServiceError(
      "Der Gruppenname muss zwischen 3 und 60 Zeichen lang sein",
      400,
    );
  }
  if (!GROUP_CATEGORIES.includes(payload.category as GroupCategory)) {
    throw new ServiceError("Ungueltige Kategorie", 400);
  }

  // Limits pruefen
  const { count: quarterCount } = await supabase
    .from("groups")
    .select("*", { count: "exact", head: true })
    .eq("quarter_id", quarterId);
  if ((quarterCount ?? 0) >= MAX_GROUPS_PER_QUARTER) {
    throw new ServiceError(
      `Maximal ${MAX_GROUPS_PER_QUARTER} Gruppen pro Quartier erlaubt`,
      400,
    );
  }

  const { count: userCount } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");
  if ((userCount ?? 0) >= MAX_GROUPS_PER_USER) {
    throw new ServiceError(
      `Sie koennen maximal ${MAX_GROUPS_PER_USER} Gruppen beitreten`,
      400,
    );
  }

  // Gruppe erstellen
  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      quarter_id: quarterId,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      category: payload.category,
      type: payload.type ?? "open",
      creator_id: userId,
      member_count: 1,
    })
    .select()
    .single();

  if (error) throw new ServiceError("Gruppe konnte nicht erstellt werden", 500);

  // Ersteller als Gruender eintragen
  await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: userId,
    role: "founder",
    status: "active",
  });

  // Gamification: Punkte fuer Gruppen-Erstellung (fire-and-forget)
  awardPoints(supabase, userId, "group_create").catch((err) =>
    console.error("[gamification] group_create awardPoints failed:", err),
  );

  return group;
}

// Gruppe bearbeiten (nur Admin/Gruender)
export async function updateGroup(
  supabase: SupabaseClient,
  userId: string,
  groupId: string,
  payload: UpdateGroupPayload,
): Promise<Group> {
  // Rolle pruefen
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!membership || !["founder", "admin"].includes(membership.role)) {
    throw new ServiceError(
      "Nur Gruender oder Admins koennen die Gruppe bearbeiten",
      403,
    );
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.description !== undefined)
    updates.description = payload.description?.trim() || null;
  if (payload.category !== undefined) updates.category = payload.category;
  if (payload.type !== undefined) updates.type = payload.type;

  const { data, error } = await supabase
    .from("groups")
    .update(updates)
    .eq("id", groupId)
    .select()
    .single();

  if (error)
    throw new ServiceError("Gruppe konnte nicht aktualisiert werden", 500);
  return data;
}

// Gruppe loeschen (nur Gruender)
export async function deleteGroup(
  supabase: SupabaseClient,
  userId: string,
  groupId: string,
): Promise<void> {
  const { data: group } = await supabase
    .from("groups")
    .select("creator_id")
    .eq("id", groupId)
    .single();

  if (!group || group.creator_id !== userId) {
    throw new ServiceError("Nur der Gruender kann die Gruppe loeschen", 403);
  }

  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error)
    throw new ServiceError("Gruppe konnte nicht geloescht werden", 500);
}

// Beitreten (offen: sofort, geschlossen: Anfrage)
export async function joinGroup(
  supabase: SupabaseClient,
  userId: string,
  groupId: string,
): Promise<GroupMember> {
  // Pruefen ob bereits Mitglied
  const { data: existing } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();

  if (existing?.status === "active") {
    throw new ServiceError("Sie sind bereits Mitglied dieser Gruppe", 400);
  }
  if (existing?.status === "pending") {
    throw new ServiceError("Ihre Beitrittsanfrage wird noch bearbeitet", 400);
  }

  // Nutzer-Limit pruefen
  const { count: userCount } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");
  if ((userCount ?? 0) >= MAX_GROUPS_PER_USER) {
    throw new ServiceError(
      `Sie koennen maximal ${MAX_GROUPS_PER_USER} Gruppen beitreten`,
      400,
    );
  }

  // Gruppentyp pruefen
  const { data: group } = await supabase
    .from("groups")
    .select("type")
    .eq("id", groupId)
    .single();

  if (!group) throw new ServiceError("Gruppe nicht gefunden", 404);

  const status = group.type === "open" ? "active" : "pending";

  // Wenn vorher entfernt, updaten statt neu einfuegen
  if (existing) {
    const { data, error } = await supabase
      .from("group_members")
      .update({ status, role: "member", joined_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new ServiceError("Beitritt fehlgeschlagen", 500);
    if (status === "active") await syncMemberCount(supabase, groupId);
    return data;
  }

  const { data, error } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: userId, role: "member", status })
    .select()
    .single();

  if (error) throw new ServiceError("Beitritt fehlgeschlagen", 500);
  if (status === "active") await syncMemberCount(supabase, groupId);
  return data;
}

// Verlassen (Gruender kann nicht verlassen)
export async function leaveGroup(
  supabase: SupabaseClient,
  userId: string,
  groupId: string,
): Promise<void> {
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!membership)
    throw new ServiceError("Sie sind kein Mitglied dieser Gruppe", 400);
  if (membership.role === "founder") {
    throw new ServiceError(
      "Als Gruender koennen Sie die Gruppe nicht verlassen. Loeschen Sie die Gruppe stattdessen.",
      400,
    );
  }

  await supabase
    .from("group_members")
    .update({ status: "removed" })
    .eq("group_id", groupId)
    .eq("user_id", userId);

  await syncMemberCount(supabase, groupId);
}

// Mitgliederliste
export async function listMembers(
  supabase: SupabaseClient,
  groupId: string,
): Promise<GroupMemberWithUser[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("*, users(display_name, avatar_url)")
    .eq("group_id", groupId)
    .in("status", ["active", "pending"])
    .order("joined_at", { ascending: true });

  if (error)
    throw new ServiceError("Mitglieder konnten nicht geladen werden", 500);
  return data ?? [];
}

// Mitglied verwalten (Admin/Gruender)
export async function updateMember(
  supabase: SupabaseClient,
  adminUserId: string,
  groupId: string,
  targetUserId: string,
  updates: { role?: string; status?: string },
): Promise<GroupMember> {
  // Admin-Rolle pruefen
  const { data: adminMembership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", adminUserId)
    .eq("status", "active")
    .single();

  if (
    !adminMembership ||
    !["founder", "admin"].includes(adminMembership.role)
  ) {
    throw new ServiceError("Keine Berechtigung", 403);
  }

  const { data, error } = await supabase
    .from("group_members")
    .update(updates)
    .eq("group_id", groupId)
    .eq("user_id", targetUserId)
    .select()
    .single();

  if (error)
    throw new ServiceError("Mitglied konnte nicht aktualisiert werden", 500);
  if (updates.status) await syncMemberCount(supabase, groupId);
  return data;
}

// Beitrittsanfrage genehmigen
export async function approveMember(
  supabase: SupabaseClient,
  adminUserId: string,
  groupId: string,
  targetUserId: string,
): Promise<GroupMember> {
  return updateMember(supabase, adminUserId, groupId, targetUserId, {
    status: "active",
  });
}
