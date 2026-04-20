// lib/housing/invitations.ts
// Bewohner-zu-Hausverwaltung Einladungen (Part H).
// Anwaltsfrei, kein Resend-SMTP - Bewohner ist Sender, App stellt nur Tools.

import { randomBytes, randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const INVITATION_EXPIRY_DAYS = 30;
const VALID_CHANNELS = ["mailto", "share", "pdf"] as const;
export type InvitationChannel = (typeof VALID_CHANNELS)[number];

export interface CreateInvitationInput {
  householdId: string;
  invitedByUserId: string;
  expectedOrgName: string;
  expectedEmail?: string;
  channel: InvitationChannel;
}

export interface CreateInvitationResult {
  token: string;
  code: string;
  expiresAt: string;
}

export interface ConsumeInvitationResult {
  civicOrgId: string;
  householdId: string;
}

// 32-stelliger base64url-Token: 24 Bytes -> 32 chars ohne Padding.
export function generateSecureToken(): string {
  return randomBytes(24).toString("base64url");
}

// 6-stellig numerisch, fuehrende Nullen erlaubt (telefonische Weitergabe).
export function generateInviteCode(): string {
  const n = randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

export async function createHousingInvitation(
  db: SupabaseClient,
  input: CreateInvitationInput,
): Promise<CreateInvitationResult> {
  if (!VALID_CHANNELS.includes(input.channel)) {
    throw new Error(`Ungueltiger channel: ${input.channel}`);
  }
  if (!input.expectedOrgName || input.expectedOrgName.trim().length === 0) {
    throw new Error("expectedOrgName (Name der Hausverwaltung) fehlt");
  }
  if (!input.householdId) throw new Error("householdId fehlt");
  if (!input.invitedByUserId) throw new Error("invitedByUserId fehlt");

  const token = generateSecureToken();
  const code = generateInviteCode();

  const row = {
    invite_token: token,
    invite_code: code,
    invited_by_user_id: input.invitedByUserId,
    invited_household_id: input.householdId,
    expected_org_name: input.expectedOrgName.trim(),
    expected_email: input.expectedEmail?.trim() || null,
    channel: input.channel,
  };

  const { data, error } = await db
    .from("housing_invitations")
    .insert(row)
    .select("invite_token, invite_code, expires_at")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message ?? "Einladung konnte nicht gespeichert werden",
    );
  }

  return {
    token: data.invite_token as string,
    code: data.invite_code as string,
    expiresAt: data.expires_at as string,
  };
}

export async function consumeHousingInvitation(
  db: SupabaseClient,
  tokenOrCode: string,
  hvUserId: string,
): Promise<ConsumeInvitationResult> {
  if (!tokenOrCode || tokenOrCode.trim().length === 0) {
    throw new Error("token oder code fehlt");
  }
  if (!hvUserId) {
    throw new Error("hvUserId (eingeloggter Hausverwalter) fehlt");
  }

  const needle = tokenOrCode.trim();

  // Lookup: Token ODER Code, nur ungenutzte + nicht abgelaufene.
  const { data: invitation, error: lookupError } = await db
    .from("housing_invitations")
    .select(
      "id, invite_token, invite_code, invited_by_user_id, invited_household_id, expected_org_name",
    )
    .or(`invite_token.eq.${needle},invite_code.eq.${needle}`)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Lookup fehlgeschlagen: ${lookupError.message}`);
  }
  if (!invitation) {
    throw new Error("Einladung nicht gefunden oder abgelaufen");
  }

  // 1. civic_organization anlegen (type='housing')
  const { data: orgRow, error: orgError } = await db
    .from("civic_organizations")
    .insert({
      name: invitation.expected_org_name,
      type: "housing",
    })
    .select("id")
    .single();

  if (orgError || !orgRow) {
    throw new Error(
      orgError?.message ?? "civic_organization konnte nicht angelegt werden",
    );
  }
  const civicOrgId = orgRow.id as string;

  // 2. civic_members: HV als civic_admin
  const { error: memberError } = await db.from("civic_members").insert({
    org_id: civicOrgId,
    user_id: hvUserId,
    role: "civic_admin",
  });
  if (memberError) {
    throw new Error(
      `civic_members INSERT fehlgeschlagen: ${memberError.message}`,
    );
  }

  // 3. housing_resident_links: Haushalt <-> HV
  const { error: linkError } = await db.from("housing_resident_links").insert({
    civic_org_id: civicOrgId,
    household_id: invitation.invited_household_id,
    user_id: invitation.invited_by_user_id,
    linked_by: hvUserId,
  });
  if (linkError) {
    throw new Error(
      `housing_resident_links INSERT fehlgeschlagen: ${linkError.message}`,
    );
  }

  // 4. Einladung als konsumiert markieren
  const { error: updateError } = await db
    .from("housing_invitations")
    .update({
      consumed_at: new Date().toISOString(),
      consumed_by_user_id: hvUserId,
      consumed_by_civic_org_id: civicOrgId,
    })
    .eq("id", invitation.id);

  if (updateError) {
    throw new Error(
      `housing_invitations UPDATE fehlgeschlagen: ${updateError.message}`,
    );
  }

  return {
    civicOrgId,
    householdId: invitation.invited_household_id as string,
  };
}
