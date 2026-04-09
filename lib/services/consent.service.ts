// Nachbar.io — Consent-Service (Phase 1 / G2)
// Verwaltet Einwilligungen (consent_grants): erteilen, widerrufen, auflisten
// Parallel zu caregiver_links — kein Breaking Change

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "./service-error";

// Erlaubte Purpose-Werte (erweiterbar in spaeterer Phase)
const VALID_PURPOSES = [
  "heartbeat_view",
  "checkin_view",
  "medication_confirm",
  "escalation_notify",
  "video_call",
  "appointment_book",
  "anamnesis_access",
  "care_coordinate",
  "civic_report",
] as const;

export type ConsentPurpose = (typeof VALID_PURPOSES)[number];

export interface ConsentGrant {
  id: string;
  subject_id: string;
  grantee_id: string | null;
  grantee_org_id: string | null;
  purpose: string;
  granted_at: string;
  revoked_at: string | null;
}

// Consent erteilen
export async function grantConsent(
  supabase: SupabaseClient,
  subjectId: string,
  params: {
    grantee_id?: string;
    grantee_org_id?: string;
    purpose: string;
  },
): Promise<ConsentGrant> {
  // Validierung: Purpose muss bekannt sein
  if (!VALID_PURPOSES.includes(params.purpose as ConsentPurpose)) {
    throw new ServiceError(
      `Ungueltiger Zweck: ${params.purpose}. Erlaubt: ${VALID_PURPOSES.join(", ")}`,
      400,
      "INVALID_PURPOSE",
    );
  }

  // Validierung: Entweder grantee_id oder grantee_org_id
  if (!params.grantee_id && !params.grantee_org_id) {
    throw new ServiceError(
      "Entweder grantee_id oder grantee_org_id muss angegeben werden",
      400,
      "MISSING_GRANTEE",
    );
  }

  // Pruefen ob bereits ein aktiver Consent fuer diese Kombination existiert
  const { data: existing } = await supabase
    .from("consent_grants")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("purpose", params.purpose)
    .is("revoked_at", null)
    .or(
      params.grantee_id
        ? `grantee_id.eq.${params.grantee_id}`
        : `grantee_org_id.eq.${params.grantee_org_id}`,
    )
    .maybeSingle();

  if (existing) {
    throw new ServiceError(
      "Einwilligung fuer diesen Zweck und Empfaenger existiert bereits",
      409,
      "CONSENT_EXISTS",
    );
  }

  // Consent erstellen
  const { data, error } = await supabase
    .from("consent_grants")
    .insert({
      subject_id: subjectId,
      grantee_id: params.grantee_id || null,
      grantee_org_id: params.grantee_org_id || null,
      purpose: params.purpose,
    })
    .select()
    .single();

  if (error) {
    throw new ServiceError(
      `Einwilligung konnte nicht erstellt werden: ${error.message}`,
      500,
      "CONSENT_CREATE_FAILED",
    );
  }

  return data;
}

// Loeschnachweis-Objekt (DSGVO Art. 7 Abs. 3 + Art. 17)
export interface DeletionReceipt {
  consent_id: string;
  subject_id: string;
  grantee_id: string | null;
  grantee_org_id: string | null;
  purpose: string;
  granted_at: string;
  revoked_at: string;
  deletion_receipt_issued_at: string;
}

// Consent widerrufen + Loeschnachweis ausstellen
export async function revokeConsent(
  supabase: SupabaseClient,
  subjectId: string,
  consentId: string,
): Promise<{ consent: ConsentGrant; deletion_receipt: DeletionReceipt }> {
  // Zuerst pruefen ob der Consent existiert und dem Bewohner gehoert
  const { data: existing, error: findError } = await supabase
    .from("consent_grants")
    .select("*")
    .eq("id", consentId)
    .eq("subject_id", subjectId)
    .maybeSingle();

  if (findError || !existing) {
    throw new ServiceError(
      "Einwilligung nicht gefunden",
      404,
      "CONSENT_NOT_FOUND",
    );
  }

  if (existing.revoked_at) {
    throw new ServiceError(
      "Einwilligung wurde bereits widerrufen",
      409,
      "CONSENT_ALREADY_REVOKED",
    );
  }

  const revokedAt = new Date().toISOString();

  // Widerrufen (revoked_at setzen)
  const { data, error } = await supabase
    .from("consent_grants")
    .update({ revoked_at: revokedAt })
    .eq("id", consentId)
    .eq("subject_id", subjectId)
    .select()
    .single();

  if (error) {
    throw new ServiceError(
      `Widerruf fehlgeschlagen: ${error.message}`,
      500,
      "CONSENT_REVOKE_FAILED",
    );
  }

  // Audit-Log: Widerruf dokumentieren (append-only)
  await supabase.from("org_audit_log").insert({
    user_id: subjectId,
    action: "consent_revoked",
    target_user_id: existing.grantee_id,
    details: {
      consent_id: consentId,
      purpose: existing.purpose,
      grantee_org_id: existing.grantee_org_id,
      granted_at: existing.granted_at,
      revoked_at: revokedAt,
    },
  });

  // Loeschnachweis erstellen (DSGVO Art. 7 Abs. 3)
  const deletion_receipt: DeletionReceipt = {
    consent_id: consentId,
    subject_id: subjectId,
    grantee_id: existing.grantee_id,
    grantee_org_id: existing.grantee_org_id,
    purpose: existing.purpose,
    granted_at: existing.granted_at,
    revoked_at: revokedAt,
    deletion_receipt_issued_at: new Date().toISOString(),
  };

  return { consent: data, deletion_receipt };
}

// Eigene Consents auflisten (als Bewohner)
export async function listConsents(
  supabase: SupabaseClient,
  subjectId: string,
  includeRevoked = false,
): Promise<ConsentGrant[]> {
  let query = supabase
    .from("consent_grants")
    .select("*")
    .eq("subject_id", subjectId);

  if (!includeRevoked) {
    query = query.is("revoked_at", null);
  }

  const { data, error } = await query.order("granted_at", {
    ascending: false,
  });

  if (error) {
    throw new ServiceError(
      `Einwilligungen konnten nicht geladen werden: ${error.message}`,
      500,
      "CONSENT_LIST_FAILED",
    );
  }

  return data || [];
}
