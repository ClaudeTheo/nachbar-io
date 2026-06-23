// Senior-Einwilligungs-Erteilung (W5 / A2:4)
//
// Nach dem Family-Setup-Claim steht der caregiver_link auf consent_status
// 'pending_senior_confirm' (senior-setup.service.ts:persistCaregiverLink). Der Senior
// bestätigt die Begleitung hier ausdrücklich -> 'active'.
//
// MUSS mit dem ADMIN-Client (service_role) aufgerufen werden: der CL-1-Trigger
// (Mig 20260618130000, enforce_caregiver_links_update_restrictions) macht
// consent_status/profile_edit_allowed/sensitive_data_allowed für Nicht-service_role
// sticky. Die Autorisierung leistet der Aufrufer (Route) über die Session-userId
// (IDOR-Schutz) — der Service prüft zusätzlich Ownership + Pending-Status.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";

export interface PendingSeniorConsent {
  linkId: string;
  caregiverName: string;
  relationshipType: string | null;
}

/**
 * Offene Einwilligungs-Anfragen des eingeloggten Seniors (als Bewohner).
 * Datensparsam: nur Anzeigename + Beziehungstyp, keine Kontaktdaten (wie AA-PRIV-1).
 */
export async function listPendingSeniorConsents(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any, "public", any>,
  seniorUserId: string,
): Promise<PendingSeniorConsent[]> {
  const { data, error } = await admin
    .from("caregiver_links")
    .select("id, relationship_type, caregiver:caregiver_id(display_name)")
    .eq("resident_id", seniorUserId)
    .eq("consent_status", "pending_senior_confirm")
    .is("revoked_at", null);

  if (error || !data) {
    if (error) {
      console.error("[senior-consent] Abfrage offener Einwilligungen fehlgeschlagen:", error.message);
    }
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => {
    const cg = row.caregiver as { display_name?: string } | null;
    return {
      linkId: row.id as string,
      caregiverName: cg?.display_name ?? "Ihr Angehöriger",
      relationshipType: (row.relationship_type as string | null) ?? null,
    };
  });
}

/**
 * Setzt die Senior-Einwilligung eines Links auf 'active'.
 *
 * Läuft mit dem ADMIN-Client (service_role, bypassed CL-1-Trigger). Eigene
 * Autorisierung statt RLS:
 *   - Link muss existieren und aktiv sein (sonst 404)
 *   - Link muss dem eingeloggten Senior gehören (sonst 403 — IDOR-Schutz)
 *   - Link muss wirklich 'pending_senior_confirm' sein (sonst 409 — idempotenzsicher)
 * Erfolg -> consent_status = 'active' (NUR diese Spalte) + Audit-Eintrag.
 */
export async function confirmSeniorConsent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any, "public", any>,
  seniorUserId: string,
  caregiverLinkId: string,
): Promise<{ consentStatus: "active" }> {
  const { data: link } = await admin
    .from("caregiver_links")
    .select("id, resident_id, consent_status, revoked_at")
    .eq("id", caregiverLinkId)
    .maybeSingle();

  if (!link || link.revoked_at) {
    throw new ServiceError("Verbindung nicht gefunden", 404, "link_not_found");
  }
  if (link.resident_id !== seniorUserId) {
    throw new ServiceError("Keine Berechtigung", 403, "not_link_owner");
  }
  if (link.consent_status !== "pending_senior_confirm") {
    throw new ServiceError("Einwilligung ist nicht offen", 409, "consent_not_pending");
  }

  const { data: updated, error: updateError } = await admin
    .from("caregiver_links")
    .update({ consent_status: "active" })
    .eq("id", caregiverLinkId)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    throw new ServiceError(
      "Einwilligung konnte nicht gespeichert werden",
      500,
      "consent_update_failed",
    );
  }

  // Audit (generische audit_log, non-blocking) — care_audit_log hätte für einen neuen
  // event_type eine Migration gebraucht; consent_status ist ein klar abgegrenztes Ereignis.
  const { error: auditError } = await admin.from("audit_log").insert({
    action: "senior_consent_confirmed",
    actor_id: seniorUserId,
    target_type: "caregiver_link",
    target_id: caregiverLinkId,
    metadata: { from: "pending_senior_confirm", to: "active" },
  });
  if (auditError) {
    console.error("[senior-consent] Audit fehlgeschlagen:", auditError.message);
  }

  return { consentStatus: "active" };
}
