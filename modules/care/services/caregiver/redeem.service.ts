// modules/care/services/caregiver/redeem.service.ts
// Nachbar.io — Einladungs-Code einloesen: Caregiver-Link erstellen (Business Logic)

import { SupabaseClient } from "@supabase/supabase-js";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/care/audit";
import { careLog } from "@/lib/care/api-helpers";
import { ServiceError } from "@/lib/services/service-error";
import type { CaregiverRelationshipType } from "@/lib/care/types";

const VALID_RELATIONSHIPS: CaregiverRelationshipType[] = [
  "partner",
  "child",
  "grandchild",
  "friend",
  "volunteer",
  "other",
];

export interface RedeemInviteInput {
  code: string;
  relationship_type: string;
}

export interface RedeemInviteResult {
  resident_name: string;
  resident_id: string;
}

export async function redeemInviteCode(
  supabase: SupabaseClient,
  userId: string,
  input: RedeemInviteInput,
): Promise<RedeemInviteResult> {
  const { code, relationship_type } = input;

  if (!code || typeof code !== "string") {
    throw new ServiceError("Code ist erforderlich", 400);
  }
  if (
    !relationship_type ||
    !VALID_RELATIONSHIPS.includes(
      relationship_type as CaregiverRelationshipType,
    )
  ) {
    throw new ServiceError("Ungültiger Beziehungstyp", 400);
  }

  // Einladung suchen
  const { data: invite, error: inviteError } = await supabase
    .from("caregiver_invites")
    .select("id, resident_id, expires_at, used_at")
    .eq("invite_code", code.toUpperCase().trim())
    .single();

  if (inviteError || !invite) {
    throw new ServiceError("Ungültiger Einladungs-Code", 404);
  }

  // Self-Invite verhindern
  if (invite.resident_id === userId) {
    throw new ServiceError("Sie können sich nicht selbst einladen", 403);
  }

  // Bereits eingeloest?
  if (invite.used_at) {
    throw new ServiceError("Einladungs-Code wurde bereits verwendet", 409);
  }

  // Abgelaufen?
  if (new Date(invite.expires_at) < new Date()) {
    throw new ServiceError("Einladungs-Code ist abgelaufen", 410);
  }

  // Admin-Client fuer privilegierte Schreiboperationen (RLS: nur service_role darf INSERT)
  const adminDb = getAdminSupabase();

  // Schritt 1: Invite atomar als "benutzt" markieren (Lock gegen Race Conditions)
  // used_at IS NULL verhindert doppeltes Einloesen
  const { data: claimed, error: claimError } = await adminDb
    .from("caregiver_invites")
    .update({ used_at: new Date().toISOString(), used_by: userId })
    .eq("id", invite.id)
    .is("used_at", null)
    .select("id")
    .single();

  if (claimError || !claimed) {
    throw new ServiceError("Einladungs-Code wurde bereits verwendet", 409);
  }

  // Schritt 2: Caregiver-Link erstellen (via Admin — RLS erlaubt kein User-INSERT)
  const { error: linkError } = await adminDb.from("caregiver_links").insert({
    resident_id: invite.resident_id,
    caregiver_id: userId,
    relationship_type,
  });

  if (linkError) {
    // Rollback: Invite wieder freigeben bei Fehler
    await adminDb
      .from("caregiver_invites")
      .update({ used_at: null, used_by: null })
      .eq("id", invite.id);

    if (linkError.code === "23505") {
      throw new ServiceError("Verknüpfung besteht bereits", 409);
    }
    throw new ServiceError("Verknüpfung konnte nicht erstellt werden", 500);
  }

  // Name des Bewohners fuer Bestaetigung holen
  const { data: resident } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", invite.resident_id)
    .single();

  await writeAuditLog(supabase, {
    seniorId: invite.resident_id,
    actorId: userId,
    eventType: "caregiver_linked",
    metadata: { relationship_type, caregiver_id: userId },
  });

  careLog("caregiver", "code_redeemed", {
    caregiverId: userId,
    residentId: invite.resident_id,
  });

  return {
    resident_name: resident?.display_name ?? "Bewohner",
    resident_id: invite.resident_id,
  };
}
