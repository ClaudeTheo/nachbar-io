import { ServiceError } from "@/lib/services/service-error";
import {
  createSetupToken,
  createShortCode,
  hashSetupToken,
  hashShortCode,
  setupExpiresAt,
} from "./token";

export const YOUTH_FRIEND_SETUP_TTL_HOURS = 12;

type QueryResult<T> = Promise<{ data: T | null; error: { message?: string; code?: string } | null }>;

interface QueryBuilder {
  select: (columns?: string) => QueryBuilder;
  insert: (payload: unknown) => QueryBuilder;
  update: (payload: unknown) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  is: (column: string, value: unknown) => QueryBuilder;
  single: <T = unknown>() => QueryResult<T>;
  maybeSingle: <T = unknown>() => QueryResult<T>;
}

interface FamilySetupDb {
  // Supabase gibt je nach Query-Schritt unterschiedliche Builder-Typen zurueck.
  from: (table: string) => any;
}

interface GuardianLinkRow {
  guardian_user_id: string;
  household_id: string | null;
  quarter_id: string | null;
}

interface FriendInviteRow {
  id: string;
  created_by: string;
  guardian_user_id: string | null;
  status: string;
  household_id: string | null;
  quarter_id: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CreateYouthFriendInviteRequestInput {
  childUserId: string;
  friendDisplayName: string;
  now?: Date;
}

export interface CreateYouthFriendInviteRequestResult {
  requestId: string;
  status: "pending_parent_approval";
}

export interface ApproveYouthFriendInviteRequestInput {
  guardianUserId: string;
  requestId: string;
  appUrl: string;
  now?: Date;
}

export interface ApproveYouthFriendInviteRequestResult {
  requestId: string;
  status: "ready";
  token: string;
  shortCode: string;
  setupUrl: string;
  expiresAt: string;
}

export async function createYouthFriendInviteRequest(
  db: FamilySetupDb,
  input: CreateYouthFriendInviteRequestInput,
): Promise<CreateYouthFriendInviteRequestResult> {
  if (!input.childUserId || !input.friendDisplayName.trim()) {
    throw new ServiceError("Name des Freundes ist erforderlich.", 400);
  }

  const guardianLink = await loadGuardianLinkForChild(db, input.childUserId);
  if (!guardianLink) {
    throw new ServiceError("Freundeinladung braucht eine Elternfreigabe.", 403);
  }

  const placeholderToken = createSetupToken();
  const { data, error } = await db
    .from("family_setup_invitations")
    .insert({
      token_hash: hashSetupToken(placeholderToken),
      flow_type: "child_friend",
      status: "pending_parent_approval",
      created_by: input.childUserId,
      guardian_user_id: guardianLink.guardian_user_id,
      household_id: guardianLink.household_id,
      quarter_id: guardianLink.quarter_id,
      target_ui_mode: "youth",
      relationship_type: "friend",
      expires_at: setupExpiresAt(YOUTH_FRIEND_SETUP_TTL_HOURS, input.now ?? new Date()).toISOString(),
      metadata: {
        friend_display_name: input.friendDisplayName.trim(),
        confidentiality_notice:
          "Nur freigeben, wenn ein echtes Vertrauensverhaeltnis besteht.",
      },
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new ServiceError("Freundeinladung konnte nicht vorbereitet werden.", 500);
  }

  return { requestId: data.id, status: "pending_parent_approval" };
}

export async function approveYouthFriendInviteRequest(
  db: FamilySetupDb,
  input: ApproveYouthFriendInviteRequestInput,
): Promise<ApproveYouthFriendInviteRequestResult> {
  if (!input.guardianUserId || !input.requestId) {
    throw new ServiceError("Elternkonto und Anfrage sind erforderlich.", 400);
  }

  const { data: request, error: requestError } = await db
    .from("family_setup_invitations")
    .select("*")
    .eq("id", input.requestId)
    .single();

  if (requestError || !request || request.status !== "pending_parent_approval") {
    throw new ServiceError("Freundeinladung ist nicht mehr freigabefaehig.", 409);
  }
  if (request.guardian_user_id !== input.guardianUserId) {
    throw new ServiceError("Diese Freundeinladung gehoert nicht zu Ihrem Konto.", 403);
  }

  const guardianLink = await loadActiveGuardianLink(
    db,
    input.guardianUserId,
    request.created_by,
  );
  if (!guardianLink) {
    throw new ServiceError("Elternfreigabe konnte nicht bestaetigt werden.", 403);
  }

  const token = createSetupToken();
  const shortCode = createShortCode();
  const expiresAt = setupExpiresAt(
    YOUTH_FRIEND_SETUP_TTL_HOURS,
    input.now ?? new Date(),
  ).toISOString();

  const { data, error } = await db
    .from("family_setup_invitations")
    .update({
      token_hash: hashSetupToken(token),
      short_code_hash: hashShortCode(shortCode),
      status: "ready",
      expires_at: expiresAt,
      metadata: {
        ...(request.metadata ?? {}),
        approved_at: (input.now ?? new Date()).toISOString(),
        approved_by: input.guardianUserId,
      },
    })
    .eq("id", request.id)
    .eq("status", "pending_parent_approval")
    .select("id, expires_at")
    .single();

  if (error || !data) {
    throw new ServiceError("Freundeinladung konnte nicht freigegeben werden.", 500);
  }

  await db.from("family_setup_audit").insert({
    invitation_id: request.id,
    actor_user_id: input.guardianUserId,
    event_type: "child_friend_invite_approved",
    metadata: {
      child_user_id: request.created_by,
      confidentiality_notice_confirmed: true,
    },
  }).select("id").single();

  return {
    requestId: data.id,
    status: "ready",
    token,
    shortCode,
    setupUrl: `${input.appUrl.replace(/\/+$/, "")}/setup/${token}`,
    expiresAt: data.expires_at,
  };
}

async function loadGuardianLinkForChild(
  db: FamilySetupDb,
  childUserId: string,
): Promise<GuardianLinkRow | null> {
  const { data } = await db
    .from("family_child_links")
    .select("guardian_user_id, household_id, quarter_id")
    .eq("child_user_id", childUserId)
    .eq("status", "active")
    .is("revoked_at", null)
    .maybeSingle();
  return data ?? null;
}

async function loadActiveGuardianLink(
  db: FamilySetupDb,
  guardianUserId: string,
  childUserId: string,
): Promise<{ id: string } | null> {
  const { data } = await db
    .from("family_child_links")
    .select("id")
    .eq("guardian_user_id", guardianUserId)
    .eq("child_user_id", childUserId)
    .eq("status", "active")
    .is("revoked_at", null)
    .maybeSingle();
  return data ?? null;
}
