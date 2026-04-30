// Nachbar.io — Privacy Export Service (DSGVO Art. 15 Auskunft + Art. 20 Datenportabilitaet)
// Sammelt alle persoenlichen Daten eines Nutzers als JSON-Export

import type { SupabaseClient } from "@supabase/supabase-js";

export interface PrivacyExportResult {
  export_version: "1.0";
  exported_at: string;
  subject_id: string;
  data: {
    profile: Record<string, unknown> | null;
    messages_sent: number;
    messages_received: number;
    checkins: Record<string, unknown>[];
    heartbeats: { count: number; latest: string | null };
    consent_grants: Record<string, unknown>[];
    caregiver_links: Record<string, unknown>[];
    group_memberships: Record<string, unknown>[];
    hilfe_requests: Record<string, unknown>[];
    marketplace_listings: Record<string, unknown>[];
    reports: Record<string, unknown>[];
    appointments: Record<string, unknown>[];
    passkeys: { count: number };
    gamification: Record<string, unknown> | null;
  };
  retention_info: {
    checkins: string;
    heartbeats: string;
    messages: string;
    consent_grants: string;
  };
}

// Maximale Zeilen pro Tabelle (Schutz gegen Riesen-Exports)
const MAX_ROWS = 5_000;

export async function exportPrivacyData(
  supabase: SupabaseClient,
  userId: string,
): Promise<PrivacyExportResult> {
  // Parallel alle Daten laden
  const [
    profileRes,
    msgSentRes,
    msgRecvRes,
    checkinsRes,
    heartbeatsRes,
    consentsRes,
    caregiverRes,
    groupsRes,
    hilfeRes,
    marketplaceRes,
    reportsRes,
    appointmentsRes,
    passkeysRes,
    gamificationRes,
  ] = await Promise.all([
    // Profil
    supabase
      .from("users")
      .select(
        "id, display_name, email, quarter_id, role, trust_level, created_at, updated_at",
      )
      .eq("id", userId)
      .single(),
    // Gesendete Nachrichten (nur Anzahl — Inhalt gehoert auch dem Empfaenger)
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", userId),
    // Empfangene Nachrichten (nur Anzahl)
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", userId),
    // Check-ins (eigene, max 5000)
    supabase
      .from("checkins")
      .select("id, status, message, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
    // Heartbeats (Anzahl + letzter)
    supabase
      .from("heartbeats")
      .select("id, created_at", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
    // Consent-Grants (eigene)
    supabase
      .from("consent_grants")
      .select("id, grantee_id, grantee_org_id, purpose, granted_at, revoked_at")
      .eq("subject_id", userId),
    // Caregiver-Links (als Bewohner oder Caregiver)
    supabase
      .from("caregiver_links")
      .select(
        "id, resident_id, caregiver_id, relationship_type, heartbeat_visible, created_at, revoked_at",
      )
      .or(`resident_id.eq.${userId},caregiver_id.eq.${userId}`),
    // Gruppen-Mitgliedschaften
    supabase
      .from("group_members")
      .select("group_id, role, joined_at")
      .eq("user_id", userId),
    // Hilfe-Anfragen
    supabase
      .from("hilfe_requests")
      .select("id, title, status, created_at")
      .eq("user_id", userId)
      .limit(MAX_ROWS),
    // Marktplatz-Anzeigen
    supabase
      .from("marketplace_listings")
      .select("id, title, type, status, created_at")
      .eq("user_id", userId)
      .limit(MAX_ROWS),
    // Maengelmeldungen
    supabase
      .from("reports")
      .select("id, title, status, created_at")
      .eq("user_id", userId)
      .limit(MAX_ROWS),
    // Termine (als Patient)
    supabase
      .from("appointments")
      .select("id, doctor_id, scheduled_at, type, status")
      .eq("patient_id", userId)
      .limit(MAX_ROWS),
    // Passkeys (nur Anzahl, kein Schlüsselmaterial)
    supabase
      .from("user_passkeys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    // Gamification
    supabase
      .from("gamification_scores")
      .select("points, level, badges")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  // Audit-Log: Export dokumentieren
  await supabase.from("org_audit_log").insert({
    user_id: userId,
    action: "privacy_data_export",
    details: { export_version: "1.0" },
  });

  return {
    export_version: "1.0",
    exported_at: new Date().toISOString(),
    subject_id: userId,
    data: {
      profile: profileRes.data ?? null,
      messages_sent: msgSentRes.count ?? 0,
      messages_received: msgRecvRes.count ?? 0,
      checkins: checkinsRes.data ?? [],
      heartbeats: {
        count: heartbeatsRes.count ?? 0,
        latest: heartbeatsRes.data?.[0]?.created_at ?? null,
      },
      consent_grants: consentsRes.data ?? [],
      caregiver_links: caregiverRes.data ?? [],
      group_memberships: groupsRes.data ?? [],
      hilfe_requests: hilfeRes.data ?? [],
      marketplace_listings: marketplaceRes.data ?? [],
      reports: reportsRes.data ?? [],
      appointments: appointmentsRes.data ?? [],
      passkeys: { count: passkeysRes.count ?? 0 },
      gamification: gamificationRes.data ?? null,
    },
    retention_info: {
      checkins: "30 Tage (Plus) / 90 Tage (Pro)",
      heartbeats: "90 Tage",
      messages: "1 Jahr (geplant)",
      consent_grants: "3 Jahre nach Widerruf (Nachweispflicht)",
    },
  };
}
