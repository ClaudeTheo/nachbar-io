// modules/care/services/caregiver/links.service.ts
// Nachbar.io — Caregiver-Links auflisten und aktualisieren (Business Logic)

import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/care/audit";
import { careLog } from "@/lib/care/api-helpers";
import { ServiceError } from "@/lib/services/service-error";

// ---------- listCaregiverLinks ----------

export interface CaregiverLinksResult {
  as_resident: Record<string, unknown>[];
  as_caregiver: Record<string, unknown>[];
}

export async function listCaregiverLinks(
  supabase: SupabaseClient,
  userId: string,
): Promise<CaregiverLinksResult> {
  // Links als Bewohner (alle eigenen)
  const { data: asResident } = await supabase
    .from("caregiver_links")
    .select("*, caregiver:caregiver_id(display_name, avatar_url)")
    .eq("resident_id", userId)
    .order("created_at", { ascending: false });

  // Links als Caregiver (nur aktive)
  const { data: asCaregiver } = await supabase
    .from("caregiver_links")
    .select("*, resident:resident_id(display_name, avatar_url)")
    .eq("caregiver_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  return {
    as_resident: asResident ?? [],
    as_caregiver: asCaregiver ?? [],
  };
}

// ---------- updateCaregiverLink ----------

export interface UpdateCaregiverLinkInput {
  revoke?: boolean;
  heartbeat_visible?: boolean;
}

export async function updateCaregiverLink(
  supabase: SupabaseClient,
  userId: string,
  linkId: string,
  input: UpdateCaregiverLinkInput,
): Promise<{ ok: true }> {
  // Pruefen ob der Link dem Bewohner gehoert
  const { data: link } = await supabase
    .from("caregiver_links")
    .select("id, resident_id, caregiver_id")
    .eq("id", linkId)
    .eq("resident_id", userId)
    .single();

  if (!link) {
    throw new ServiceError("Link nicht gefunden", 404);
  }

  const updates: Record<string, unknown> = {};

  // Widerruf
  if (input.revoke === true) {
    updates.revoked_at = new Date().toISOString();
    await writeAuditLog(supabase, {
      seniorId: userId,
      actorId: userId,
      eventType: "caregiver_revoked",
      metadata: { caregiver_id: link.caregiver_id, link_id: linkId },
    });
    careLog("caregiver", "link_revoked", { linkId });
  }

  // Heartbeat-Toggle
  if (typeof input.heartbeat_visible === "boolean") {
    updates.heartbeat_visible = input.heartbeat_visible;
    await writeAuditLog(supabase, {
      seniorId: userId,
      actorId: userId,
      eventType: "heartbeat_toggle",
      metadata: {
        caregiver_id: link.caregiver_id,
        visible: input.heartbeat_visible,
      },
    });
    careLog("caregiver", "heartbeat_toggled", {
      linkId,
      visible: input.heartbeat_visible,
    });
  }

  if (Object.keys(updates).length === 0) {
    throw new ServiceError("Keine Änderungen angegeben", 400);
  }

  const { error } = await supabase
    .from("caregiver_links")
    .update(updates)
    .eq("id", linkId);

  if (error) {
    throw new ServiceError("Aktualisierung fehlgeschlagen", 500);
  }

  return { ok: true };
}
