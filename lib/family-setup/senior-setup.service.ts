import { ServiceError } from "@/lib/services/service-error";
import {
  canClaimInvitation,
  createSetupToken,
  createShortCode,
  hashSetupToken,
  hashShortCode,
  setupExpiresAt,
} from "./token";
import type { FamilySetupStatus, SeniorRelationshipType } from "./types";

export const SENIOR_SETUP_TTL_HOURS = 24;

type SeniorSetupUiMode = "senior" | "comfort";
type QueryResult<T> = Promise<{ data: T | null; error: { message?: string; code?: string } | null }>;

interface QueryBuilder {
  select: (columns?: string) => QueryBuilder;
  insert: (payload: unknown) => QueryBuilder;
  update: (payload: unknown) => QueryBuilder;
  upsert: (payload: unknown, options?: unknown) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  is: (column: string, value: unknown) => QueryBuilder;
  gt: (column: string, value: unknown) => QueryBuilder;
  single: <T = unknown>() => QueryResult<T>;
  maybeSingle: <T = unknown>() => QueryResult<T>;
}

interface FamilySetupDb {
  from: (table: string) => QueryBuilder;
  auth?: {
    admin?: {
      createUser: (input: {
        email: string;
        password: string;
        email_confirm: boolean;
        user_metadata: Record<string, unknown>;
      }) => Promise<{
        data: { user: { id: string } | null } | null;
        error: { message?: string; code?: string } | null;
      }>;
      deleteUser?: (userId: string) => Promise<unknown>;
    };
  };
}

interface Membership {
  household_id: string | null;
  households?: { quarter_id?: string | null } | Array<{ quarter_id?: string | null }> | null;
}

interface SeniorSetupInvitationRow {
  id: string;
  status: FamilySetupStatus;
  used_at: string | null;
  expires_at: string;
  created_by: string;
  household_id: string | null;
  quarter_id: string | null;
  target_ui_mode: SeniorSetupUiMode;
  relationship_type: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CreateSeniorSetupInvitationInput {
  caregiverUserId: string;
  seniorDisplayName: string;
  relationshipType: SeniorRelationshipType;
  targetUiMode?: SeniorSetupUiMode;
  appUrl: string;
  now?: Date;
}

export interface CreateSeniorSetupInvitationResult {
  invitationId: string;
  status: FamilySetupStatus;
  token: string;
  shortCode: string;
  setupUrl: string;
  expiresAt: string;
}

export interface ClaimSeniorSetupInvitationInput {
  token: string;
  email: string;
  password: string;
  displayName: string;
  now?: Date;
}

export interface ClaimSeniorSetupInvitationResult {
  userId: string;
  redirectTo: "/kreis-start" | "/dashboard";
}

export async function createSeniorSetupInvitation(
  db: FamilySetupDb,
  input: CreateSeniorSetupInvitationInput,
): Promise<CreateSeniorSetupInvitationResult> {
  validateSeniorSetupInput(input);

  const token = createSetupToken();
  const shortCode = createShortCode();
  const now = input.now ?? new Date();
  const expiresAt = setupExpiresAt(SENIOR_SETUP_TTL_HOURS, now).toISOString();
  const membership = await loadMembership(db, input.caregiverUserId);
  const targetUiMode = input.targetUiMode ?? "senior";

  const { data, error } = await db
    .from("family_setup_invitations")
    .insert({
      token_hash: hashSetupToken(token),
      short_code_hash: hashShortCode(shortCode),
      flow_type: "senior_setup",
      status: "ready",
      created_by: input.caregiverUserId,
      household_id: membership?.household_id ?? null,
      quarter_id: resolveQuarterId(membership),
      target_ui_mode: targetUiMode,
      relationship_type: input.relationshipType,
      expires_at: expiresAt,
      metadata: {
        senior_display_name: input.seniorDisplayName,
        consent_version: "senior-family-setup-v1.0-2026-05-14",
      },
    })
    .select("id, expires_at")
    .single<{ id: string; expires_at: string }>();

  if (error || !data) {
    throw new ServiceError("Senior-Zugang konnte nicht vorbereitet werden.", 500);
  }

  return {
    invitationId: data.id,
    status: "ready",
    token,
    shortCode,
    setupUrl: `${normalizeAppUrl(input.appUrl)}/setup/${token}`,
    expiresAt: data.expires_at,
  };
}

export async function claimSeniorSetupInvitation(
  db: FamilySetupDb,
  input: ClaimSeniorSetupInvitationInput,
): Promise<ClaimSeniorSetupInvitationResult> {
  if (!input.token || !input.email || !input.password || !input.displayName.trim()) {
    throw new ServiceError("Token, E-Mail, Passwort und Name sind erforderlich.", 400);
  }

  const now = input.now ?? new Date();
  const tokenHash = hashSetupToken(input.token);
  const { data: invitation, error: invitationError } = await db
    .from("family_setup_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .single<SeniorSetupInvitationRow>();

  if (invitationError || !invitation || !canClaimInvitation(invitation, now)) {
    throw new ServiceError("Setup-Code ist ungueltig oder abgelaufen.", 410);
  }

  const claimedAt = now.toISOString();
  const { data: claimLock, error: claimError } = await db
    .from("family_setup_invitations")
    .update({ status: "claimed", used_at: claimedAt })
    .eq("id", invitation.id)
    .eq("status", "ready")
    .is("used_at", null)
    .gt("expires_at", claimedAt)
    .select("id")
    .single<{ id: string }>();

  if (claimError || !claimLock) {
    throw new ServiceError("Setup-Code wurde bereits verwendet.", 409);
  }

  const authAdmin = db.auth?.admin;
  if (!authAdmin) {
    await rollbackClaim(db, invitation.id);
    throw new ServiceError("Admin-Client ist nicht verfuegbar.", 500);
  }

  const { data: authData, error: authError } = await authAdmin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      display_name: input.displayName,
      ui_mode: invitation.target_ui_mode,
      family_setup_invitation_id: invitation.id,
    },
  });

  const userId = authData?.user?.id;
  if (authError || !userId) {
    await rollbackClaim(db, invitation.id);
    throw new ServiceError("Senior-Konto konnte nicht erstellt werden.", 409);
  }

  try {
    await persistSeniorUser(db, { userId, input, invitation, now });
  } catch (error) {
    await authAdmin.deleteUser?.(userId);
    await rollbackClaim(db, invitation.id);
    throw error;
  }

  return {
    userId,
    redirectTo: invitation.target_ui_mode === "senior" ? "/kreis-start" : "/dashboard",
  };
}

async function loadMembership(
  db: FamilySetupDb,
  userId: string,
): Promise<Membership | null> {
  const { data } = await db
    .from("household_members")
    .select("household_id, households(quarter_id)")
    .eq("user_id", userId)
    .maybeSingle<Membership>();

  return data ?? null;
}

async function persistSeniorUser(
  db: FamilySetupDb,
  options: {
    userId: string;
    input: ClaimSeniorSetupInvitationInput;
    invitation: SeniorSetupInvitationRow;
    now: Date;
  },
): Promise<void> {
  const displayName = options.input.displayName.trim();
  await assertNoError(
    db.from("users").upsert(
      {
        id: options.userId,
        email_hash: hashSetupToken(options.input.email.toLowerCase()),
        display_name: displayName,
        full_name: displayName,
        ui_mode: options.invitation.target_ui_mode,
        role: "resident",
        trust_level: "verified",
        settings: {
          family_setup_invitation_id: options.invitation.id,
          setup_by_caregiver_id: options.invitation.created_by,
        },
      },
      { onConflict: "id" },
    ).select("id").single(),
    "Senior-Profil konnte nicht erstellt werden.",
  );

  if (options.invitation.household_id) {
    await assertNoError(
      db.from("household_members").insert({
        household_id: options.invitation.household_id,
        user_id: options.userId,
        verification_method: "relative_setup",
        verified_at: options.now.toISOString(),
      }).select("id").single(),
      "Haushaltszuordnung konnte nicht gespeichert werden.",
    );
  }

  await persistCaregiverLink(db, options);

  await assertNoError(
    db.from("family_setup_invitations").update({
      target_user_id: options.userId,
      used_by: options.userId,
      updated_at: options.now.toISOString(),
    }).eq("id", options.invitation.id).select("id").single(),
    "Setup-Einladung konnte nicht abgeschlossen werden.",
  );
}

async function persistCaregiverLink(
  db: FamilySetupDb,
  options: {
    userId: string;
    invitation: SeniorSetupInvitationRow;
  },
): Promise<void> {
  const { error } = await db
    .from("caregiver_links")
    .insert({
      resident_id: options.userId,
      caregiver_id: options.invitation.created_by,
      relationship_type: normalizeSeniorRelationship(options.invitation.relationship_type),
      heartbeat_visible: false,
      setup_origin: "family_qr",
      consent_status: "pending_senior_confirm",
      profile_edit_allowed: true,
      sensitive_data_allowed: false,
    })
    .select("id")
    .single<{ id: string }>();

  if (error?.code === "23505") {
    throw new ServiceError(
      "Diese Angehoerigen-Verknuepfung besteht bereits.",
      409,
      "CAREGIVER_LINK_EXISTS",
    );
  }
  if (error) {
    throw new ServiceError("Angehoerigen-Verknuepfung konnte nicht gespeichert werden.", 500);
  }
}

async function rollbackClaim(db: FamilySetupDb, invitationId: string): Promise<void> {
  await db
    .from("family_setup_invitations")
    .update({ status: "ready", used_at: null, used_by: null })
    .eq("id", invitationId)
    .select("id")
    .single();
}

async function assertNoError(
  result: QueryResult<unknown>,
  message: string,
): Promise<void> {
  const { error } = await result;
  if (error) {
    throw new ServiceError(message, 500);
  }
}

function validateSeniorSetupInput(input: CreateSeniorSetupInvitationInput): void {
  if (!input.caregiverUserId || !input.seniorDisplayName.trim()) {
    throw new ServiceError("Angehoerige Person und Name sind erforderlich.", 400);
  }
  if (input.targetUiMode && input.targetUiMode !== "senior" && input.targetUiMode !== "comfort") {
    throw new ServiceError("Ungueltiger Senior-Modus.", 400);
  }
}

function normalizeSeniorRelationship(value: string | null): SeniorRelationshipType {
  const allowed: SeniorRelationshipType[] = [
    "partner",
    "child",
    "grandchild",
    "friend",
    "volunteer",
    "other",
  ];
  return allowed.includes(value as SeniorRelationshipType)
    ? (value as SeniorRelationshipType)
    : "other";
}

function resolveQuarterId(membership: Membership | null): string | null {
  const households = membership?.households;
  if (Array.isArray(households)) {
    return households[0]?.quarter_id ?? null;
  }
  return households?.quarter_id ?? null;
}

function normalizeAppUrl(appUrl: string): string {
  return appUrl.replace(/\/+$/, "");
}
