import { ServiceError } from "@/lib/services/service-error";
import {
  canClaimInvitation,
  createSetupToken,
  createShortCode,
  hashSetupToken,
  hashShortCode,
  setupExpiresAt,
} from "./token";
import type { ChildRelationshipType, FamilySetupStatus } from "./types";

export const MAX_DIRECT_CHILD_ACCOUNTS = 5;
export const CHILD_SETUP_TTL_HOURS = 24;
export const FAMILY_SETUP_CONSENT_VERSION = "family-setup-v1.0-2026-05-14";

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

interface GuardianMembership {
  household_id: string | null;
  households?: { quarter_id?: string | null } | Array<{ quarter_id?: string | null }> | null;
}

interface FamilySetupInvitationRow {
  id: string;
  status: FamilySetupStatus;
  used_at: string | null;
  expires_at: string;
  guardian_user_id: string | null;
  household_id: string | null;
  quarter_id: string | null;
  relationship_type: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CreateChildSetupInvitationInput {
  guardianUserId: string;
  childDisplayName: string;
  childBirthYear: number;
  relationshipType?: ChildRelationshipType;
  appUrl: string;
  now?: Date;
}

export interface CreateChildSetupInvitationResult {
  invitationId: string;
  status: FamilySetupStatus;
  token: string;
  shortCode: string;
  setupUrl: string;
  expiresAt: string;
}

export interface ClaimChildSetupInvitationInput {
  token: string;
  email: string;
  password: string;
  displayName: string;
  now?: Date;
}

export interface ClaimChildSetupInvitationResult {
  userId: string;
  redirectTo: "/jugend";
}

export async function createChildSetupInvitation(
  db: FamilySetupDb,
  input: CreateChildSetupInvitationInput,
): Promise<CreateChildSetupInvitationResult> {
  validateChildSetupInput(input);

  const now = input.now ?? new Date();
  const relationshipType = input.relationshipType ?? "parent";
  const [activeLinks, membership] = await Promise.all([
    loadActiveChildLinks(db, input.guardianUserId),
    loadGuardianMembership(db, input.guardianUserId),
  ]);

  if (activeLinks.length >= MAX_DIRECT_CHILD_ACCOUNTS) {
    await insertChildSetupInvitation(db, {
      input,
      now,
      membership,
      relationshipType,
      status: "needs_admin_review",
      exposeToken: false,
    });
    throw new ServiceError(
      "Mehr als 5 Kinderkonten muessen kurz geprueft werden.",
      409,
      "CHILD_LIMIT_REVIEW_REQUIRED",
      { status: "needs_admin_review" },
    );
  }

  return insertChildSetupInvitation(db, {
    input,
    now,
    membership,
    relationshipType,
    status: "ready",
    exposeToken: true,
  });
}

export async function claimChildSetupInvitation(
  db: FamilySetupDb,
  input: ClaimChildSetupInvitationInput,
): Promise<ClaimChildSetupInvitationResult> {
  if (!input.token || !input.email || !input.password || !input.displayName) {
    throw new ServiceError("Token, E-Mail, Passwort und Name sind erforderlich.", 400);
  }

  const now = input.now ?? new Date();
  const tokenHash = hashSetupToken(input.token);
  const { data: invitation, error: invitationError } = await db
    .from("family_setup_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .single<FamilySetupInvitationRow>();

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
      ui_mode: "youth",
      family_setup_invitation_id: invitation.id,
    },
  });

  const userId = authData?.user?.id;
  if (authError || !userId) {
    await rollbackClaim(db, invitation.id);
    throw new ServiceError(
      "Kinderkonto konnte nicht erstellt werden.",
      authError?.code === "email_exists" ? 409 : 409,
    );
  }

  try {
    const birthYear = readBirthYear(invitation);
    await persistYouthUser(db, {
      userId,
      input,
      invitation,
      birthYear,
      now,
    });
  } catch (error) {
    await authAdmin.deleteUser?.(userId);
    await rollbackClaim(db, invitation.id);
    throw error;
  }

  return { userId, redirectTo: "/jugend" };
}

async function loadActiveChildLinks(
  db: FamilySetupDb,
  guardianUserId: string,
): Promise<Array<{ id: string }>> {
  const { data, error } = (await (db
    .from("family_child_links")
    .select("id")
    .eq("guardian_user_id", guardianUserId)
    .eq("status", "active")
    .is("revoked_at", null) as unknown as Promise<{
      data: Array<{ id: string }> | null;
      error: { message?: string; code?: string } | null;
    }>));

  if (error) {
    throw new ServiceError("Kinderkonten konnten nicht geladen werden.", 500);
  }
  return Array.isArray(data) ? data : [];
}

async function loadGuardianMembership(
  db: FamilySetupDb,
  guardianUserId: string,
): Promise<GuardianMembership | null> {
  const { data } = await db
    .from("household_members")
    .select("household_id, households(quarter_id)")
    .eq("user_id", guardianUserId)
    .maybeSingle<GuardianMembership>();

  return data ?? null;
}

async function insertChildSetupInvitation(
  db: FamilySetupDb,
  options: {
    input: CreateChildSetupInvitationInput;
    now: Date;
    membership: GuardianMembership | null;
    relationshipType: ChildRelationshipType;
    status: FamilySetupStatus;
    exposeToken: boolean;
  },
): Promise<CreateChildSetupInvitationResult> {
  const token = createSetupToken();
  const shortCode = createShortCode();
  const expiresAt = setupExpiresAt(CHILD_SETUP_TTL_HOURS, options.now).toISOString();
  const householdId = options.membership?.household_id ?? null;
  const quarterId = resolveQuarterId(options.membership);

  const { data, error } = await db
    .from("family_setup_invitations")
    .insert({
      token_hash: hashSetupToken(token),
      short_code_hash: hashShortCode(shortCode),
      flow_type: "child_direct",
      status: options.status,
      created_by: options.input.guardianUserId,
      guardian_user_id: options.input.guardianUserId,
      household_id: householdId,
      quarter_id: quarterId,
      target_ui_mode: "youth",
      relationship_type: options.relationshipType,
      expires_at: expiresAt,
      metadata: {
        child_display_name: options.input.childDisplayName,
        child_birth_year: options.input.childBirthYear,
        consent_version: FAMILY_SETUP_CONSENT_VERSION,
      },
    })
    .select("id, expires_at")
    .single<{ id: string; expires_at: string }>();

  if (error || !data) {
    throw new ServiceError("Kinderzugang konnte nicht vorbereitet werden.", 500);
  }

  if (!options.exposeToken) {
    return {
      invitationId: data.id,
      status: options.status,
      token: "",
      shortCode: "",
      setupUrl: "",
      expiresAt: data.expires_at,
    };
  }

  return {
    invitationId: data.id,
    status: options.status,
    token,
    shortCode,
    setupUrl: `${normalizeAppUrl(options.input.appUrl)}/setup/${token}`,
    expiresAt: data.expires_at,
  };
}

async function persistYouthUser(
  db: FamilySetupDb,
  options: {
    userId: string;
    input: ClaimChildSetupInvitationInput;
    invitation: FamilySetupInvitationRow;
    birthYear: number;
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
        ui_mode: "youth",
        role: "resident",
        trust_level: "verified",
        settings: {
          family_setup_invitation_id: options.invitation.id,
          guardian_user_id: options.invitation.guardian_user_id,
        },
      },
      { onConflict: "id" },
    ).select("id").single(),
    "Jugendprofil konnte nicht erstellt werden.",
  );

  await assertNoError(
    db.from("youth_profiles").insert({
      user_id: options.userId,
      birth_year: options.birthYear,
      age_group: calculateYouthAgeGroup(options.birthYear, options.now),
      access_level: "basis",
      phone_hash: hashSetupToken(`family-setup:${options.input.email.toLowerCase()}`),
      quarter_id: options.invitation.quarter_id,
    }).select("id").single(),
    "Jugendprofil konnte nicht gespeichert werden.",
  );

  await assertNoError(
    db.from("family_child_links").insert({
      guardian_user_id: options.invitation.guardian_user_id,
      child_user_id: options.userId,
      household_id: options.invitation.household_id,
      quarter_id: options.invitation.quarter_id,
      relationship_type: normalizeChildRelationship(options.invitation.relationship_type),
      status: "active",
      consent_version: FAMILY_SETUP_CONSENT_VERSION,
    }).select("id").single(),
    "Eltern-Kind-Verknuepfung konnte nicht gespeichert werden.",
  );

  if (options.invitation.household_id) {
    await assertNoError(
      db.from("household_members").insert({
        household_id: options.invitation.household_id,
        user_id: options.userId,
        verification_method: "guardian_setup",
        verified_at: options.now.toISOString(),
      }).select("id").single(),
      "Haushaltszuordnung konnte nicht gespeichert werden.",
    );
  }

  await assertNoError(
    db.from("family_setup_invitations").update({
      target_user_id: options.userId,
      used_by: options.userId,
      updated_at: options.now.toISOString(),
    }).eq("id", options.invitation.id).select("id").single(),
    "Setup-Einladung konnte nicht abgeschlossen werden.",
  );
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

function validateChildSetupInput(input: CreateChildSetupInvitationInput): void {
  if (!input.guardianUserId || !input.childDisplayName.trim()) {
    throw new ServiceError("Guardian und Name sind erforderlich.", 400);
  }
  const currentYear = (input.now ?? new Date()).getFullYear();
  const age = currentYear - input.childBirthYear;
  if (!Number.isInteger(input.childBirthYear) || age < 0 || age > 17) {
    throw new ServiceError("Kinderzugang ist nur fuer Minderjaehrige vorgesehen.", 400);
  }
}

function readBirthYear(invitation: FamilySetupInvitationRow): number {
  const value = invitation.metadata?.child_birth_year;
  if (typeof value !== "number") {
    throw new ServiceError("Geburtsjahr fehlt im Setup-Code.", 400);
  }
  return value;
}

function calculateYouthAgeGroup(birthYear: number, now: Date): "u16" | "16_17" {
  return now.getFullYear() - birthYear < 16 ? "u16" : "16_17";
}

function normalizeChildRelationship(value: string | null): ChildRelationshipType {
  return value === "guardian" || value === "other" ? value : "parent";
}

function resolveQuarterId(membership: GuardianMembership | null): string | null {
  const households = membership?.households;
  if (Array.isArray(households)) {
    return households[0]?.quarter_id ?? null;
  }
  return households?.quarter_id ?? null;
}

function normalizeAppUrl(appUrl: string): string {
  return appUrl.replace(/\/+$/, "");
}
