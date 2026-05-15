// lib/family-setup/audit.service.ts
// Audit-Logging fuer Family-Setup-Aktionen.
//
// Hintergrund (Pass 63 Security-Audit FS-2):
//   Tabelle family_setup_audit (Mig 197) existiert, wurde aber nur fuer
//   Friend-Approval-Inserts genutzt. claimChildSetupInvitation,
//   claimSeniorSetupInvitation, rollbackClaim und needs_admin_review-Pfad
//   schrieben keine Audit-Eintraege.
//
// DSGVO Art. 32 + ISO/IEC 27001 fordern Audit-Trail fuer Konto-Erstellung
// Minderjaehriger. needs_admin_review ohne Audit ist nicht reviewbar.
//
// Best-Effort-Insert: Fehler beim Audit darf den Hauptpfad nicht abbrechen,
// aber sie werden geloggt fuer spaetere Forensik.

import { createHash } from "node:crypto";

export type FamilySetupAuditEventType =
  | "invitation_created"
  | "invitation_claimed"
  | "invitation_rollback"
  | "invitation_revoked"
  | "child_limit_review_triggered"
  | "friend_request_created"
  | "friend_request_approved"
  | "friend_request_rejected"
  | "senior_consent_granted"
  | "senior_consent_revoked";

export interface AuditContext {
  ip?: string | null;
  userAgent?: string | null;
}

export interface FamilySetupAuditInput {
  invitationId: string | null;
  actorUserId: string | null;
  eventType: FamilySetupAuditEventType;
  context?: AuditContext;
  metadata?: Record<string, unknown>;
}

interface AuditDb {
  from: (table: string) => {
    insert: (payload: unknown) => PromiseLike<{
      error: { message?: string; code?: string } | null;
    }>;
  };
}

function hashOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Schreibt einen Audit-Eintrag in family_setup_audit.
 * Wirft KEINE Exceptions — Fehler werden geloggt aber nicht propagiert,
 * damit der Hauptpfad (z.B. Claim) durchlaeuft.
 *
 * Wenn der Audit-Insert fehlschlaegt, ist das ein operationelles Problem
 * (Tabelle fehlt, RLS-Bug, DB-Timeout), kein Sicherheitsproblem fuer den
 * User. Der Hauptpfad ist autoritativ.
 */
export async function recordFamilySetupAudit(
  db: AuditDb,
  input: FamilySetupAuditInput,
): Promise<void> {
  const payload = {
    invitation_id: input.invitationId,
    actor_user_id: input.actorUserId,
    event_type: input.eventType,
    ip_hash: hashOrNull(input.context?.ip ?? null),
    user_agent_hash: hashOrNull(input.context?.userAgent ?? null),
    metadata: input.metadata ?? {},
  };

  try {
    const { error } = await db.from("family_setup_audit").insert(payload);
    if (error) {
      console.warn(
        "[family-setup-audit] insert failed",
        JSON.stringify({
          event: input.eventType,
          invitationId: input.invitationId,
          code: error.code,
          message: error.message,
        }),
      );
    }
  } catch (err) {
    console.warn(
      "[family-setup-audit] insert threw",
      JSON.stringify({
        event: input.eventType,
        invitationId: input.invitationId,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}

/**
 * Extrahiert IP + User-Agent aus einem Next.js Request fuer Audit-Logging.
 * Bevorzugt x-forwarded-for (Vercel-Standard) ueber direkte RemoteAddr.
 */
export function extractAuditContextFromRequest(request: Request): AuditContext {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;
  return { ip, userAgent };
}
