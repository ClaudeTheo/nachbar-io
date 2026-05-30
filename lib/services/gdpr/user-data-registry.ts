// Nachbar.io — GDPR User-Data-Registry (Single Source of Truth)
//
// Diese Datei ist die *eine* autoritative Liste aller personenbezogenen Tabellen
// mit Nutzerbezug. Drei Verbraucher leiten daraus ab:
//   1. Export-Service  (gdpr-export.service.ts) — Art. 15/20 Auskunft
//   2. FK-Migration    (20260529..._gdpr_deletion_cascade.sql) — Art. 17 Löschung
//   3. DSE-Konsistenz  (datenschutz §11) — was wir öffentlich versprechen
//
// HINTERGRUND (Pre-Pilot-Audit 2026-05-29, Cluster B): Der frühere Lösch-/Export-Code
// sprach nicht existierende Tabellen an (`profiles`, `checkins`, `messages`, …) und
// ließ die Art.-9-Care-Daten komplett aus. Tabellennamen hier sind gegen das reale
// Prod-Schema (uylszchlyhbpbmslcnka, 2026-05-29) verifiziert.
//
// SCOPE: Resident/Caregiver/Senior/Memory/Group/Consent-Datenraum (Pilot).
// Profi-Verticals (doctor_*/medical_*/civic_*/practice_*/prescription_*/prevention-staff/
// team_*) sind bewusst auf eine Folge-Welle vertagt — im geschlossenen Pilot existieren
// keine solchen Nutzer außer dem Founder (nicht löschbar). Siehe PR-Beschreibung.

// ============================================================
// Export-Registry (Art. 15/20) — was ein Nutzer über sich erhält
// ============================================================

export type ExportMode = "rows" | "count";

export interface GdprExportTable {
  /** Reale Tabelle in public.* */
  table: string;
  /** Spalte(n), über die der Nutzer als Daten-Subjekt gefiltert wird (OR-verknüpft). */
  filterColumns: readonly string[];
  /** "rows" = alle Zeilen, "count" = nur Anzahl (kein sensibles Material exportieren). */
  mode: ExportMode;
  /** Verschlüsselte Felder, die für den Betroffenen entschlüsselt werden müssen. */
  encryptedFields?: readonly string[];
  /** Enthält Art.-9-Gesundheitsdaten (Kennzeichnung im Export). */
  art9?: boolean;
  /** Schlüssel im Export-JSON. */
  key: string;
  /** Menschlich lesbares Label (auch für DSE-Löschliste). */
  label: string;
}

export const GDPR_EXPORT_TABLES: readonly GdprExportTable[] = [
  // --- Profil & Kern ---
  { table: "users", filterColumns: ["id"], mode: "rows", key: "profil", label: "Nutzerprofil und Einstellungen" },
  { table: "household_members", filterColumns: ["user_id"], mode: "rows", key: "haushalt", label: "Haushaltszuordnung" },
  { table: "emergency_profiles", filterColumns: ["user_id"], mode: "rows", key: "notfallprofil", label: "Notfallprofil" },
  { table: "skills", filterColumns: ["user_id"], mode: "rows", key: "kompetenzen", label: "Kompetenzen" },

  // --- Eigene Beiträge / Aktivität ---
  { table: "help_requests", filterColumns: ["user_id"], mode: "rows", key: "hilfeanfragen", label: "Hilfeanfragen" },
  { table: "help_responses", filterColumns: ["responder_user_id"], mode: "rows", key: "hilfeantworten", label: "Hilfeantworten" },
  { table: "marketplace_items", filterColumns: ["user_id"], mode: "rows", key: "marktplatz", label: "Marktplatz-Anzeigen" },
  { table: "leihboerse_items", filterColumns: ["user_id"], mode: "rows", key: "leihboerse", label: "Leihbörse-Einträge" },
  { table: "lost_found", filterColumns: ["user_id"], mode: "rows", key: "fundsachen", label: "Fundsachen" },
  { table: "events", filterColumns: ["user_id"], mode: "rows", key: "veranstaltungen", label: "Erstellte Veranstaltungen" },
  { table: "event_participants", filterColumns: ["user_id"], mode: "rows", key: "veranstaltungsteilnahmen", label: "Veranstaltungsteilnahmen" },
  { table: "polls", filterColumns: ["user_id"], mode: "rows", key: "umfragen", label: "Umfragen" },
  { table: "poll_votes", filterColumns: ["user_id"], mode: "rows", key: "umfragestimmen", label: "Umfrage-Stimmen" },
  { table: "community_tips", filterColumns: ["user_id"], mode: "rows", key: "tipps", label: "Nachbarschafts-Tipps" },
  { table: "tip_confirmations", filterColumns: ["user_id"], mode: "rows", key: "tippbestaetigungen", label: "Tipp-Bestätigungen" },
  { table: "expert_reviews", filterColumns: ["expert_user_id", "reviewer_user_id"], mode: "rows", key: "bewertungen", label: "Bewertungen" },
  { table: "expert_endorsements", filterColumns: ["expert_user_id", "endorser_user_id"], mode: "rows", key: "empfehlungen", label: "Empfehlungen" },
  { table: "paketannahme", filterColumns: ["user_id"], mode: "rows", key: "paketannahme", label: "Paketannahme" },
  { table: "meal_signups", filterColumns: ["user_id"], mode: "rows", key: "essensanmeldungen", label: "Essens-Anmeldungen" },
  { table: "shared_meals", filterColumns: ["user_id"], mode: "rows", key: "gemeinsame_mahlzeiten", label: "Gemeinsame Mahlzeiten" },

  // --- Kommunikation ---
  { table: "direct_messages", filterColumns: ["sender_id"], mode: "rows", key: "direktnachrichten", label: "Direktnachrichten" },
  { table: "group_members", filterColumns: ["user_id"], mode: "rows", key: "gruppenmitgliedschaften", label: "Gruppen-Mitgliedschaften" },
  { table: "group_posts", filterColumns: ["user_id"], mode: "rows", key: "gruppenbeitraege", label: "Gruppen-Beiträge" },
  { table: "group_post_comments", filterColumns: ["user_id"], mode: "rows", key: "gruppenkommentare", label: "Gruppen-Kommentare" },
  { table: "chat_group_members", filterColumns: ["user_id"], mode: "rows", key: "chatgruppen", label: "Chat-Gruppen" },

  // --- Status / Aktivitätssignale ---
  { table: "heartbeats", filterColumns: ["user_id"], mode: "count", key: "lebenszeichen", label: "Aktivitätssignale (Lebenszeichen)" },
  { table: "senior_checkins", filterColumns: ["user_id"], mode: "rows", key: "tagescheck", label: "Tagescheck-Historie" },
  { table: "vacation_modes", filterColumns: ["user_id"], mode: "rows", key: "urlaubsmodus", label: "Urlaubsmodus" },

  // --- Care (Art. 9 Gesundheitsdaten) ---
  { table: "care_profiles", filterColumns: ["user_id"], mode: "rows", art9: true, encryptedFields: ["medical_notes", "preferred_hospital", "insurance_number"], key: "pflegeprofil", label: "Pflegeprofil (Gesundheitsdaten)" },
  { table: "care_checkins", filterColumns: ["senior_id"], mode: "rows", art9: true, encryptedFields: ["note"], key: "pflege_tagescheck", label: "Pflege-Tagescheck" },
  { table: "care_medications", filterColumns: ["senior_id"], mode: "rows", art9: true, encryptedFields: ["name", "dosage", "instructions"], key: "medikamente", label: "Medikamente" },
  { table: "care_medication_logs", filterColumns: ["senior_id"], mode: "rows", art9: true, key: "medikamenteneinnahme", label: "Medikamenten-Einnahmeprotokoll" },
  { table: "care_sos_alerts", filterColumns: ["senior_id"], mode: "rows", art9: true, encryptedFields: ["notes"], key: "notfallalarme", label: "Notfall-Alarme" },
  { table: "care_sos_responses", filterColumns: ["helper_id"], mode: "rows", encryptedFields: ["note"], key: "notfallantworten", label: "Notfall-Antworten (als Helfer)" },
  { table: "care_appointments", filterColumns: ["senior_id"], mode: "rows", encryptedFields: ["location", "notes"], key: "pflegetermine", label: "Pflege-Termine" },
  { table: "care_documents", filterColumns: ["senior_id"], mode: "rows", art9: true, key: "pflegedokumente", label: "Pflege-Dokumente (Metadaten)" },
  { table: "care_tasks", filterColumns: ["creator_id"], mode: "rows", key: "pflegeaufgaben", label: "Pflege-Aufgaben" },
  { table: "care_shopping_requests", filterColumns: ["requester_id"], mode: "rows", key: "einkaufslisten", label: "Einkaufs-Anfragen" },
  { table: "care_visits", filterColumns: ["resident_id"], mode: "rows", key: "pflegebesuche", label: "Pflege-Besuche" },
  { table: "care_helpers", filterColumns: ["user_id"], mode: "rows", key: "pflegehelfer", label: "Pflege-Helfer-Status" },
  { table: "caregiver_links", filterColumns: ["resident_id", "caregiver_id"], mode: "rows", key: "angehoerige", label: "Angehörigen-Verknüpfungen" },
  { table: "pflegegrad_assessments", filterColumns: ["user_id"], mode: "rows", art9: true, key: "pflegegrad", label: "Pflegegrad-Einschätzungen" },

  // --- Memory (Senioren-Gedächtnis, Art. 9-nah) ---
  { table: "user_memory_facts", filterColumns: ["user_id"], mode: "rows", art9: true, key: "gedaechtnis_fakten", label: "Gespeicherte Gedächtnis-Fakten" },
  { table: "user_memory_consents", filterColumns: ["user_id"], mode: "rows", key: "gedaechtnis_einwilligungen", label: "Gedächtnis-Einwilligungen" },

  // --- Einwilligungen ---
  { table: "consent_grants", filterColumns: ["subject_id"], mode: "rows", key: "freigaben", label: "Daten-Freigaben" },
  { table: "care_consents", filterColumns: ["user_id"], mode: "rows", key: "pflege_einwilligungen", label: "Pflege-Einwilligungen" },
  { table: "user_consents", filterColumns: ["user_id"], mode: "rows", key: "einwilligungen", label: "Einwilligungen (AGB/DSE)" },

  // --- Reputation / Sonstiges ---
  { table: "reputation_points", filterColumns: ["user_id"], mode: "rows", key: "reputation", label: "Reputationsdaten" },
  { table: "points_log", filterColumns: ["user_id"], mode: "rows", key: "punktelog", label: "Punkte-Verlauf" },
  { table: "user_badges", filterColumns: ["user_id"], mode: "rows", key: "abzeichen", label: "Abzeichen" },
  { table: "notifications", filterColumns: ["user_id"], mode: "rows", key: "benachrichtigungen", label: "Benachrichtigungen" },
  { table: "neighbor_invitations", filterColumns: ["inviter_id"], mode: "rows", key: "einladungen", label: "Versendete Einladungen" },
  { table: "push_subscriptions", filterColumns: ["user_id"], mode: "count", key: "push_geraete", label: "Push-Geräte (Anzahl)" },
  { table: "passkey_credentials", filterColumns: ["user_id"], mode: "count", key: "passkeys", label: "Passkeys (Anzahl, kein Schlüsselmaterial)" },
  { table: "alerts", filterColumns: ["user_id"], mode: "rows", key: "soforthilfe_alarme", label: "Soforthilfe-Alarme" },
  { table: "alert_responses", filterColumns: ["responder_user_id"], mode: "rows", key: "soforthilfe_antworten", label: "Soforthilfe-Antworten" },
] as const;

// ============================================================
// Lösch-FK-Plan (Art. 17) — Spiegel der FK-Migration
// ============================================================
//
// Jeder Eintrag = ein Fremdschlüssel auf users(id), den die Migration umstellt.
// "cascade"  → Daten-Subjekt: Zeile gehört dem Nutzer, wird mitgelöscht.
// "set null" → Aktor/Log/Fremdbezug: Zeile bleibt, Nutzerbezug wird entfernt.
// "wasNotNull: true" → Spalte muss in der Migration zuerst nullable gemacht werden.
//
// Der Migration-Static-Test (gdpr-migration.test.ts) prüft, dass die SQL-Datei
// für JEDEN Eintrag ein passendes Statement enthält → kein TS/SQL-Drift.

export type FkRule = "cascade" | "set null";

export interface GdprDeletionFk {
  schema: "public" | "auth";
  table: string;
  column: string;
  rule: FkRule;
  /** Spalte war NOT NULL und wird in der Migration nullable gemacht (nur bei set null). */
  wasNotNull?: boolean;
  /** Sonderfall care_audit_log: Trigger no_audit_delete muss GDPR-fähig sein. */
  auditTriggerTable?: boolean;
}

export const GDPR_DELETION_FKS: readonly GdprDeletionFk[] = [
  // --- care_* Subjekt (senior/user/resident/requester/creator/helper) → CASCADE ---
  { schema: "public", table: "care_appointments", column: "senior_id", rule: "cascade" },
  { schema: "public", table: "care_checkins", column: "senior_id", rule: "cascade" },
  { schema: "public", table: "care_documents", column: "senior_id", rule: "cascade" },
  { schema: "public", table: "care_helpers", column: "user_id", rule: "cascade" },
  { schema: "public", table: "care_medication_logs", column: "senior_id", rule: "cascade" },
  { schema: "public", table: "care_medications", column: "senior_id", rule: "cascade" },
  { schema: "public", table: "care_shopping_requests", column: "requester_id", rule: "cascade" },
  { schema: "public", table: "care_sos_alerts", column: "senior_id", rule: "cascade" },
  { schema: "public", table: "care_sos_responses", column: "helper_id", rule: "cascade" },
  { schema: "public", table: "care_tasks", column: "creator_id", rule: "cascade" },
  { schema: "public", table: "care_visits", column: "resident_id", rule: "cascade" },
  { schema: "auth", table: "care_profiles_hilfe", column: "user_id", rule: "cascade" },
  // care_audit_log: Subjekt mitlöschen (Founder-Entscheidung), Trigger GDPR-fähig
  { schema: "public", table: "care_audit_log", column: "senior_id", rule: "cascade", auditTriggerTable: true },

  // --- care_* Aktor (managed/verified/claimed/accepted/resolved/generated) → SET NULL ---
  { schema: "public", table: "care_appointments", column: "managed_by", rule: "set null" },
  { schema: "public", table: "care_documents", column: "generated_by", rule: "set null", wasNotNull: true },
  { schema: "public", table: "care_helpers", column: "verified_by", rule: "set null" },
  { schema: "public", table: "care_medications", column: "managed_by", rule: "set null" },
  { schema: "public", table: "care_shopping_requests", column: "claimed_by", rule: "set null" },
  { schema: "public", table: "care_sos_alerts", column: "accepted_by", rule: "set null" },
  { schema: "public", table: "care_sos_alerts", column: "resolved_by", rule: "set null" },
  { schema: "public", table: "care_tasks", column: "claimed_by", rule: "set null" },
  { schema: "public", table: "care_visits", column: "caregiver_user_id", rule: "set null" },
  { schema: "public", table: "care_audit_log", column: "actor_id", rule: "set null", wasNotNull: true, auditTriggerTable: true },

  // --- caregiver_links (public-FKs blockieren public.users-DELETE) → CASCADE ---
  { schema: "public", table: "caregiver_links", column: "resident_id", rule: "cascade" },
  { schema: "public", table: "caregiver_links", column: "caregiver_id", rule: "cascade" },

  // --- Gruppen ---
  { schema: "public", table: "group_members", column: "user_id", rule: "cascade" },
  { schema: "public", table: "group_posts", column: "user_id", rule: "cascade" },
  { schema: "public", table: "group_post_comments", column: "user_id", rule: "cascade" },
  { schema: "auth", table: "group_notification_settings", column: "user_id", rule: "cascade" },
  // Gruppe bleibt für die übrigen Mitglieder bestehen, Ersteller-Bezug wird entfernt
  { schema: "public", table: "groups", column: "creator_id", rule: "set null", wasNotNull: true },

  // --- Memory ---
  { schema: "auth", table: "user_memory_audit_log", column: "actor_user_id", rule: "set null", wasNotNull: true },
  { schema: "auth", table: "user_memory_audit_log", column: "target_user_id", rule: "set null", wasNotNull: true },
  { schema: "auth", table: "user_memory_consents", column: "granted_by", rule: "set null" },
  { schema: "auth", table: "user_memory_facts", column: "source_user_id", rule: "set null" },

  // --- Einwilligungen / Notfallprofil / Konsultationen ---
  { schema: "auth", table: "user_consents", column: "user_id", rule: "cascade" },
  { schema: "public", table: "emergency_profiles", column: "user_id", rule: "cascade" },
  { schema: "public", table: "consultation_consents", column: "user_id", rule: "cascade" },
  { schema: "public", table: "consultation_slots", column: "host_user_id", rule: "set null" },
  { schema: "public", table: "consultation_slots", column: "booked_by", rule: "set null" },

  // --- Pflegegrad / Plus-Trial / Helfer / Essen ---
  { schema: "public", table: "pflegegrad_assessments", column: "user_id", rule: "cascade" },
  { schema: "public", table: "pflegegrad_assessments", column: "assessor_id", rule: "set null", wasNotNull: true },
  { schema: "public", table: "plus_trial_grants", column: "caregiver_user_id", rule: "cascade" },
  { schema: "auth", table: "neighborhood_helpers", column: "user_id", rule: "cascade" },
  { schema: "auth", table: "helper_connections", column: "resident_id", rule: "cascade" },
  { schema: "auth", table: "help_monthly_reports", column: "resident_id", rule: "cascade" },
  { schema: "auth", table: "meal_signups", column: "user_id", rule: "cascade" },
  { schema: "auth", table: "shared_meals", column: "user_id", rule: "cascade" },

  // --- Sicherheits-/Audit-Logs → SET NULL (anonymisieren, Founder-Entscheidung) ---
  { schema: "public", table: "security_events", column: "user_id", rule: "set null" },
  { schema: "public", table: "security_events", column: "resolved_by", rule: "set null" },
  { schema: "auth", table: "admin_audit_log", column: "admin_id", rule: "set null", wasNotNull: true },
  { schema: "auth", table: "audit_log", column: "actor_id", rule: "set null", wasNotNull: true },
  { schema: "auth", table: "org_audit_log", column: "user_id", rule: "set null", wasNotNull: true },
  { schema: "auth", table: "org_audit_log", column: "target_user_id", rule: "set null" },
  { schema: "auth", table: "data_requests", column: "admin_id", rule: "set null" },

  // --- Ausleihe / Videosprechstunde Aktorbezug → SET NULL ---
  { schema: "public", table: "leihboerse_items", column: "reserved_by", rule: "set null" },
  { schema: "auth", table: "consultation_slots", column: "cancelled_by", rule: "set null" },
  { schema: "auth", table: "consultation_slots", column: "proposed_by", rule: "set null" },

  // --- Quartier-/Invite-Aktorbezug → SET NULL ---
  { schema: "public", table: "quarters", column: "created_by", rule: "set null" },
  { schema: "public", table: "quarter_admins", column: "assigned_by", rule: "set null" },
  { schema: "auth", table: "invite_codes", column: "created_by", rule: "set null", wasNotNull: true },
  { schema: "auth", table: "invite_codes", column: "used_by", rule: "set null" },
  { schema: "auth", table: "caregiver_invites", column: "used_by", rule: "set null" },

  // === Teil 2 (Migration 20260530120000): Aktor-/Bezugs-FKs außerhalb Profi-Vertical ===
  // Alle SET NULL (Bezug anonymisieren, Zeile bleibt). Profi-Medizin/Civic/Pflege bleiben
  // vertagt (Aufbewahrungsfristen § 630f BGB / MBO-Ä). Alle parent = auth.users.
  // --- Resident / Familie / Youth ---
  { schema: "auth", table: "neighbor_invitations", column: "accepted_by", rule: "set null" },
  { schema: "auth", table: "neighbor_invitations", column: "converted_user_id", rule: "set null" },
  { schema: "auth", table: "users", column: "registered_by", rule: "set null" },
  { schema: "auth", table: "content_reports", column: "reporter_id", rule: "set null", wasNotNull: true },
  { schema: "auth", table: "content_reports", column: "reviewed_by", rule: "set null" },
  { schema: "auth", table: "youth_tasks", column: "accepted_by", rule: "set null" },
  { schema: "auth", table: "youth_tasks", column: "created_by", rule: "set null", wasNotNull: true },
  { schema: "auth", table: "youth_moderation_log", column: "moderator_id", rule: "set null", wasNotNull: true },
  // --- Admin / Org / Business (Aktor-/Log-Bezüge — Buchhaltung/Logs bleiben erhalten) ---
  { schema: "auth", table: "access_codes", column: "created_by", rule: "set null", wasNotNull: true },
  { schema: "auth", table: "admin_access_logs", column: "admin_id", rule: "set null", wasNotNull: true },
  { schema: "auth", table: "admin_expenses", column: "admin_id", rule: "set null" },
  { schema: "auth", table: "business_settings", column: "updated_by", rule: "set null" },
  { schema: "auth", table: "business_transactions", column: "created_by", rule: "set null" },
  { schema: "auth", table: "data_breach_incidents", column: "admin_id", rule: "set null" },
  { schema: "auth", table: "feature_flags_audit_log", column: "changed_by", rule: "set null" },
  { schema: "auth", table: "moderation_actions", column: "created_by", rule: "set null" },
  { schema: "auth", table: "moderation_queue", column: "reviewed_by", rule: "set null" },
  { schema: "auth", table: "monthly_summaries", column: "closed_by", rule: "set null" },
  { schema: "auth", table: "tech_incidents", column: "admin_id", rule: "set null" },
  { schema: "auth", table: "verification_requests", column: "reviewed_by", rule: "set null" },
  { schema: "auth", table: "org_neighbors", column: "confirmed_by", rule: "set null" },
  { schema: "auth", table: "org_neighbors", column: "requested_by", rule: "set null" },
  { schema: "auth", table: "organizations", column: "verified_by", rule: "set null" },
  { schema: "auth", table: "cross_org_requests", column: "created_by", rule: "set null", wasNotNull: true },
  { schema: "auth", table: "cross_org_requests", column: "modified_by", rule: "set null" },
] as const;

// ============================================================
// Abgeleitete Helfer
// ============================================================

/** Tabellen, deren Zeilen bei Löschung mitgelöscht werden (Subjekt-Daten). */
export function deletionCascadeTargets(): readonly GdprDeletionFk[] {
  return GDPR_DELETION_FKS.filter((fk) => fk.rule === "cascade");
}

/** Aktor-/Log-Referenzen, die auf NULL gesetzt werden. */
export function deletionSetNullTargets(): readonly GdprDeletionFk[] {
  return GDPR_DELETION_FKS.filter((fk) => fk.rule === "set null");
}

/** Spalten, die die Migration zuerst nullable machen muss. */
export function columnsToMakeNullable(): readonly GdprDeletionFk[] {
  return GDPR_DELETION_FKS.filter((fk) => fk.rule === "set null" && fk.wasNotNull === true);
}

/** Menschlich lesbare Löschliste für die Datenschutzerklärung (§11). */
export function deletionLabelsForPrivacyPolicy(): string[] {
  const labels = new Set<string>();
  for (const t of GDPR_EXPORT_TABLES) labels.add(t.label);
  return [...labels];
}

/** Tabellen mit Art.-9-Gesundheitsdaten (für Kennzeichnung/Tests). */
export function art9ExportTables(): readonly GdprExportTable[] {
  return GDPR_EXPORT_TABLES.filter((t) => t.art9 === true);
}
