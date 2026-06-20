// Senior-Auto-Annahme-Service (Welle AA-3)
//
// Der Senior willigt PRO Angehoerigen-Link ausdruecklich in die automatische
// Anruf-Annahme ein (oder widerruft sie). Auto-Annahme greift nur, wenn BEIDE
// Seiten zustimmen: der Angehoerige (auto_answer_allowed, Mig 084) UND der Senior
// (auto_answer_senior_consented_at, Mig AA-1).
//
// Sicherheits-Auflagen aus dem Mini-Audit (2026-06-18):
//   - AA-RLS-3 (IDOR): der Schreibpfad laeuft ueber den ADMIN-Client (service_role),
//     NACH explizitem Ownership-Check (resident_id === eingeloggter Bewohner).
//     Wir verlassen uns NICHT auf die spaltenlose RLS-UPDATE-Policy (071:50).
//   - AA-AUDIT-1: jeder Consent-Wechsel schreibt einen care_audit_log-Eintrag.
// Der Sticky-Trigger aus Mig AA-1 stellt zusaetzlich sicher, dass die Spalte
// ausschliesslich ueber diesen service_role-Pfad aenderbar ist.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { writeAuditLog } from "@/lib/care/audit";

export interface SeniorCallContact {
  linkId: string;
  caregiverName: string;
  caregiverAvatar: string | null;
  /** Angehoeriger hat Auto-Annahme grundsaetzlich erlaubt (Mig 084) */
  autoAnswerAllowed: boolean;
  /** Senior hat ausdruecklich eingewilligt (Mig AA-1) */
  autoAnswerConsented: boolean;
}

/**
 * Aktive Angehoerigen-Verbindungen des Seniors (als Bewohner), fuer die
 * Anrufe-Einstellungsseite. Bewusst datensparsam: nur Anzeigename + Avatar,
 * keine Kontaktdaten des Angehoerigen (Mini-Audit AA-PRIV-1).
 */
export async function listSeniorCallContacts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  residentUserId: string,
): Promise<SeniorCallContact[]> {
  const { data, error } = await supabase
    .from("caregiver_links")
    .select(
      "id, auto_answer_allowed, auto_answer_senior_consented_at, caregiver:caregiver_id(display_name, avatar_url)",
    )
    .eq("resident_id", residentUserId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) {
      console.error("[senior-auto-answer] Link-Abfrage fehlgeschlagen:", error.message);
    }
    return [];
  }

  return data.map((row: Record<string, unknown>) => {
    const cg = row.caregiver as {
      display_name?: string;
      avatar_url?: string | null;
    } | null;
    return {
      linkId: row.id as string,
      caregiverName: cg?.display_name ?? "Unbekannt",
      caregiverAvatar: cg?.avatar_url ?? null,
      autoAnswerAllowed: Boolean(row.auto_answer_allowed),
      autoAnswerConsented: row.auto_answer_senior_consented_at != null,
    };
  });
}

/**
 * Setzt oder entzieht die Senior-Einwilligung fuer die Auto-Annahme eines Links.
 *
 * Laeuft mit dem ADMIN-Client (service_role). Eigene Autorisierung statt RLS:
 *   - Link muss existieren und aktiv sein (sonst 404)
 *   - Link muss dem eingeloggten Bewohner gehoeren (sonst 403 — IDOR-Schutz)
 * Erfolg -> auto_answer_senior_consented_at = now() (consent) bzw. NULL (Widerruf)
 * + revisionssicherer Audit-Eintrag.
 */
export async function setAutoAnswerConsent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any, "public", any>,
  residentUserId: string,
  caregiverLinkId: string,
  consent: boolean,
): Promise<{ consent: boolean; consentedAt: string | null }> {
  const { data: link } = await admin
    .from("caregiver_links")
    .select("id, resident_id, revoked_at")
    .eq("id", caregiverLinkId)
    .maybeSingle();

  if (!link || link.revoked_at) {
    throw new ServiceError("Verbindung nicht gefunden", 404, "link_not_found");
  }

  // AA-RLS-3: nur der Bewohner des Links darf einwilligen/widerrufen.
  if (link.resident_id !== residentUserId) {
    throw new ServiceError("Keine Berechtigung", 403, "not_link_owner");
  }

  const consentedAt = consent ? new Date().toISOString() : null;

  const { data: updated, error: updateError } = await admin
    .from("caregiver_links")
    .update({ auto_answer_senior_consented_at: consentedAt })
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

  // AA-AUDIT-1: Consent-Wechsel revisionssicher protokollieren (ohne Kontaktdaten).
  await writeAuditLog(admin, {
    seniorId: residentUserId,
    actorId: residentUserId,
    eventType: "auto_answer_consent_changed",
    referenceType: "caregiver_link",
    referenceId: caregiverLinkId,
    metadata: { consent },
  });

  return { consent, consentedAt };
}
