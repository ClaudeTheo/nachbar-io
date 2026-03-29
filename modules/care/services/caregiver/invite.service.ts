// modules/care/services/caregiver/invite.service.ts
// Nachbar.io — Caregiver-Einladung: 8-stelliger Code, 24h gueltig (Business Logic)

import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/care/audit";
import { careLog } from "@/lib/care/api-helpers";
import {
  MAX_CAREGIVERS_PER_RESIDENT,
  INVITE_CODE_LENGTH,
  INVITE_CODE_EXPIRY_HOURS,
} from "@/lib/care/constants";
import { ServiceError } from "@/lib/services/service-error";

// 8-stelliger alphanumerischer Code (ohne verwechselbare Zeichen: 0/O, 1/I/L)
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface InviteCodeResult {
  code: string;
  expires_at: string;
}

export async function createInviteCode(
  supabase: SupabaseClient,
  userId: string,
): Promise<InviteCodeResult> {
  // Aktive Links zaehlen
  const { data: activeLinks } = await supabase
    .from("caregiver_links")
    .select("id")
    .eq("resident_id", userId)
    .is("revoked_at", null);

  if ((activeLinks?.length ?? 0) >= MAX_CAREGIVERS_PER_RESIDENT) {
    throw new ServiceError(
      `Maximal ${MAX_CAREGIVERS_PER_RESIDENT} Angehörige erlaubt`,
      409,
    );
  }

  const code = generateInviteCode();
  const expiresAt = new Date(
    Date.now() + INVITE_CODE_EXPIRY_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("caregiver_invites")
    .insert({
      resident_id: userId,
      invite_code: code,
      expires_at: expiresAt,
    })
    .select("invite_code, expires_at")
    .single();

  if (error) {
    throw new ServiceError("Einladung konnte nicht erstellt werden", 500);
  }

  await writeAuditLog(supabase, {
    seniorId: userId,
    actorId: userId,
    eventType: "caregiver_invited",
    metadata: { invite_code: code },
  });

  careLog("caregiver", "invite_created", { userId });

  return { code: data.invite_code, expires_at: data.expires_at };
}
