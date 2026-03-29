// Nachbar.io — User-Account-Service
// Zentralisiert DSGVO-Operationen: Löschung (Art. 17), Export (Art. 20), Account-Deletion-Request
// Business-Logik aus: account/delete-request, user/delete, user/export

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";

// ============================================================
// Rate Limiting (In-Memory, reicht fuer Pilot)
// ============================================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

// ============================================================
// Account-Löschung via Web (OTP-basiert, Google Play Policy)
// ============================================================

export interface AccountDeletionRequestParams {
  email: string;
  action: "request" | "confirm";
  otp?: string;
}

/**
 * Bearbeitet Account-Löschungsanfragen via Web (ohne Auth-Session).
 * Verwendet Service-Role-Key fuer OTP-Versand und Löschmarkierung.
 */
export async function requestAccountDeletion(
  adminClient: SupabaseClient,
  params: AccountDeletionRequestParams,
): Promise<{ ok: boolean }> {
  const { email, action, otp } = params;

  // Validierung
  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new ServiceError("Ungültige E-Mail-Adresse", 400);
  }

  if (!action || !["request", "confirm"].includes(action)) {
    throw new ServiceError("Ungültige Aktion", 400);
  }

  if (!checkRateLimit(email.toLowerCase())) {
    throw new ServiceError(
      "Zu viele Anfragen. Bitte versuchen Sie es in einer Stunde erneut.",
      429,
    );
  }

  if (action === "request") {
    // OTP an die E-Mail senden via Supabase Auth
    await adminClient.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    // Kein Hinweis ob E-Mail existiert (Anti-Enumeration)
    return { ok: true };
  }

  if (action === "confirm") {
    if (!otp || typeof otp !== "string" || otp.length !== 6) {
      throw new ServiceError("Ungültiger Bestätigungscode", 400);
    }

    // OTP verifizieren
    const { data: verifyData, error: verifyError } =
      await adminClient.auth.verifyOtp({
        email: email.trim(),
        token: otp,
        type: "email",
      });

    if (verifyError || !verifyData?.user) {
      throw new ServiceError("Ungültiger oder abgelaufener Code", 400);
    }

    // Account zur Löschung markieren (soft delete mit 30 Tage Frist)
    const userId = verifyData.user.id;

    // Profil als zur Löschung markiert setzen
    await adminClient
      .from("profiles")
      .update({
        deletion_requested_at: new Date().toISOString(),
        display_name: "Gelöschter Nutzer",
      })
      .eq("id", userId);

    // Audit-Log
    await adminClient.from("org_audit_log").insert({
      user_id: userId,
      action: "account_deletion_requested",
      details: { source: "web", email: email.trim() },
    });

    return { ok: true };
  }

  throw new ServiceError("Unbekannte Aktion", 400);
}

// ============================================================
// DSGVO Art. 17 — Recht auf Löschung (authentifiziert)
// ============================================================

/**
 * Löscht das Nutzerkonto und alle zugehörigen Daten.
 * Erfordert Admin-Client (Service-Role) fuer Auth-User-Löschung.
 */
export async function deleteUser(
  adminClient: SupabaseClient,
  userId: string,
  confirmText: string,
): Promise<{ success: true; message: string }> {
  // Bestätigungs-Text prüfen (Schutz gegen versehentliches Löschen)
  if (confirmText !== "KONTO LÖSCHEN") {
    throw new ServiceError(
      "Bitte bestätigen Sie die Löschung mit dem korrekten Text",
      400,
    );
  }

  const errors: string[] = [];

  // Kaskaden-Löschung mit Fehler-Tracking
  const cascadeDeletes: { table: string; filter: [string, string] }[] = [
    { table: "push_subscriptions", filter: ["user_id", userId] },
    { table: "notifications", filter: ["user_id", userId] },
    { table: "reputation_points", filter: ["user_id", userId] },
    { table: "neighbor_invitations", filter: ["inviter_id", userId] },
    { table: "verification_requests", filter: ["user_id", userId] },
    { table: "vacation_modes", filter: ["user_id", userId] },
    { table: "household_members", filter: ["user_id", userId] },
  ];

  for (const { table, filter } of cascadeDeletes) {
    const { error } = await adminClient
      .from(table)
      .delete()
      .eq(filter[0], filter[1]);
    if (error) {
      console.error(`DSGVO-Löschung ${table} fehlgeschlagen:`, error.message);
      errors.push(table);
    }
  }

  // Nutzerprofil aus users-Tabelle entfernen
  const { error: profileDeleteError } = await adminClient
    .from("users")
    .delete()
    .eq("id", userId);
  if (profileDeleteError) {
    console.error(
      "DSGVO-Löschung users fehlgeschlagen:",
      profileDeleteError.message,
    );
    errors.push("users");
  }

  // Bei kritischen Fehlern abbrechen BEVOR Auth-User gelöscht wird
  if (errors.length > 0) {
    console.error(
      `DSGVO-Löschung unvollständig (${errors.join(", ")}), Auth-User bleibt erhalten`,
    );
    throw new ServiceError(
      `Daten konnten nicht vollständig gelöscht werden (${errors.join(", ")}). Bitte kontaktieren Sie den Admin.`,
      500,
    );
  }

  // Auth-User löschen (erst wenn alle Daten entfernt — sonst verwaiste Daten)
  const { error: deleteError } =
    await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("Auth-User-Löschung fehlgeschlagen:", deleteError);
    throw new ServiceError(
      "Konto konnte nicht vollständig gelöscht werden. Bitte kontaktieren Sie den Admin.",
      500,
    );
  }

  return {
    success: true,
    message: "Ihr Konto und alle zugehörigen Daten wurden gelöscht.",
  };
}

// ============================================================
// DSGVO Art. 20 — Recht auf Datenportabilität
// ============================================================

/**
 * Exportiert alle personenbezogenen Daten des Nutzers.
 * Gibt ein strukturiertes Objekt zurueck (Route formatiert als JSON-Download).
 */
export async function exportUserData(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown>> {
  // Parallele Abfragen aller Nutzerdaten
  const [
    profileResult,
    membershipResult,
    skillsResult,
    alertsResult,
    alertResponsesResult,
    helpRequestsResult,
    marketplaceResult,
    eventsCreatedResult,
    eventParticipationsResult,
    messagesResult,
    notificationsResult,
    invitationsResult,
    reputationResult,
    tipsResult,
    reviewsResult,
    endorsementsResult,
    vacationsResult,
  ] = await Promise.all([
    // Profil
    supabase
      .from("users")
      .select(
        "id, display_name, bio, phone, avatar_url, trust_level, ui_mode, created_at",
      )
      .eq("id", userId)
      .single(),
    // Haushaltsmitgliedschaft
    supabase
      .from("household_members")
      .select(
        "household_id, role, verification_method, joined_at, household:households(street_name, house_number)",
      )
      .eq("user_id", userId),
    // Kompetenzen
    supabase
      .from("skills")
      .select("category, description, created_at")
      .eq("user_id", userId),
    // Soforthilfe-Alerts
    supabase
      .from("alerts")
      .select("id, category, urgency, title, description, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    // Alert-Antworten
    supabase
      .from("alert_responses")
      .select("alert_id, message, created_at")
      .eq("responder_user_id", userId)
      .order("created_at", { ascending: false }),
    // Hilfe-Anfragen
    supabase
      .from("help_requests")
      .select("id, category, title, description, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    // Marktplatz-Inserate
    supabase
      .from("marketplace_items")
      .select("id, type, category, title, description, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    // Erstellte Events
    supabase
      .from("events")
      .select("id, title, description, event_date, location, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    // Event-Teilnahmen
    supabase
      .from("event_participants")
      .select("event_id, status, created_at")
      .eq("user_id", userId),
    // Nachrichten
    supabase
      .from("messages")
      .select("id, conversation_id, content, created_at")
      .eq("sender_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    // Benachrichtigungen (letzte 50)
    supabase
      .from("notifications")
      .select("type, title, body, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    // Einladungen
    supabase
      .from("neighbor_invitations")
      .select("invite_method, status, created_at, accepted_at")
      .eq("inviter_id", userId),
    // Reputation
    supabase
      .from("reputation_points")
      .select("points, reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    // Nachbarschafts-Tipps
    supabase
      .from("community_tips")
      .select("id, category, title, description, status, created_at")
      .eq("user_id", userId),
    // Bewertungen erhalten
    supabase
      .from("expert_reviews")
      .select("rating, comment, created_at")
      .eq("expert_user_id", userId),
    // Empfehlungen erhalten
    supabase
      .from("expert_endorsements")
      .select("category, created_at")
      .eq("expert_user_id", userId),
    // Urlaubsmodus
    supabase
      .from("vacation_modes")
      .select("start_date, end_date, note, created_at")
      .eq("user_id", userId),
  ]);

  return {
    exportInfo: {
      exportDate: new Date().toISOString(),
      service: "QuartierApp",
      description:
        "Vollständiger Export Ihrer personenbezogenen Daten gemäß DSGVO Art. 20",
    },
    profile: profileResult.data,
    household: membershipResult.data,
    skills: skillsResult.data ?? [],
    alerts: alertsResult.data ?? [],
    alertResponses: alertResponsesResult.data ?? [],
    helpRequests: helpRequestsResult.data ?? [],
    marketplaceItems: marketplaceResult.data ?? [],
    eventsCreated: eventsCreatedResult.data ?? [],
    eventParticipations: eventParticipationsResult.data ?? [],
    messages: messagesResult.data ?? [],
    notifications: notificationsResult.data ?? [],
    invitations: invitationsResult.data ?? [],
    reputationPoints: reputationResult.data ?? [],
    communityTips: tipsResult.data ?? [],
    reviewsReceived: reviewsResult.data ?? [],
    endorsementsReceived: endorsementsResult.data ?? [],
    vacations: vacationsResult.data ?? [],
  };
}
