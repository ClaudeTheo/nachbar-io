// modules/youth/services/youth-routes.service.ts
// Nachbar.io — Service-Layer fuer Jugend-Routen (9 Routen)
// Extrahierte Business-Logik: Tasks, Report, Register, Consent

import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { ServiceError } from "@/lib/services/service-error";
import {
  calculateAgeGroup,
  getAccessLevel,
} from "@/modules/youth/services/profile";
import {
  generateConsentToken,
  hashToken,
  isTokenExpired,
  CONSENT_TEXT_VERSION,
  TOKEN_EXPIRY_HOURS,
  MAX_TOKEN_SENDS,
} from "@/modules/youth/services/consent";
import { sendSms } from "@/lib/care/channels/sms";
import { encryptField } from "@/lib/care/field-encryption";

// --- Konstanten ---

export const VALID_CATEGORIES = [
  "technik",
  "garten",
  "begleitung",
  "digital",
  "event",
] as const;

export const VALID_TARGET_TYPES = ["task", "message", "post", "user"] as const;

export const AUTO_SUSPEND_THRESHOLD = 3;

const ALLOWED_TASK_UPDATE_FIELDS = [
  "title",
  "description",
  "status",
  "risk_level",
  "estimated_minutes",
  "points_reward",
];

// --- Typen ---

export interface ListTasksParams {
  quarterId?: string | null;
  category?: string | null;
  status?: string;
}

export interface CreateTaskBody {
  title?: string;
  description?: string;
  category?: string;
  quarter_id?: string;
  risk_level?: string;
  estimated_minutes?: number;
  points_reward?: number;
}

export interface ReportBody {
  target_type?: string;
  target_id?: string;
  reason?: string;
}

export interface RegisterBody {
  birth_year?: number;
  quarter_id?: string;
  first_name?: string;
}

export interface RegisterUser {
  id: string;
  phone?: string;
}

export interface ConsentVerifyBody {
  token: string;
  guardian_name: string;
}

export interface ConsentRevokeBody {
  youth_user_id: string;
  revoked_via: string;
}

export interface RequestHeaders {
  ip: string;
  userAgent: string;
}

export interface ConsentSendUser {
  id: string;
  user_metadata?: { first_name?: string };
}

// --- Task-Services ---

/**
 * Aufgaben auflisten — gefiltert nach Quartier, Kategorie, Status
 */
export async function listYouthTasks(
  supabase: SupabaseClient,
  _userId: string,
  params: ListTasksParams,
) {
  const taskStatus = params.status || "open";

  let query = supabase
    .from("youth_tasks")
    .select("*")
    .eq("status", taskStatus)
    .order("created_at", { ascending: false })
    .limit(50);

  if (params.quarterId) {
    query = query.eq("quarter_id", params.quarterId);
  }
  if (
    params.category &&
    VALID_CATEGORIES.includes(
      params.category as (typeof VALID_CATEGORIES)[number],
    )
  ) {
    query = query.eq("category", params.category);
  }

  const { data: tasks, error } = await query;

  if (error) {
    throw new ServiceError("Aufgaben konnten nicht geladen werden", 500);
  }

  return { tasks };
}

/**
 * Neue Aufgabe erstellen — Validierung + Insert
 */
export async function createYouthTask(
  supabase: SupabaseClient,
  userId: string,
  body: CreateTaskBody,
) {
  const {
    title,
    description,
    category,
    quarter_id,
    risk_level,
    estimated_minutes,
    points_reward,
  } = body;

  // Validierung
  if (!title || title.length < 3 || title.length > 200) {
    throw new ServiceError(
      "Titel muss zwischen 3 und 200 Zeichen lang sein",
      400,
    );
  }
  if (!description || description.length < 10) {
    throw new ServiceError(
      "Beschreibung muss mindestens 10 Zeichen lang sein",
      400,
    );
  }
  if (
    !category ||
    !VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])
  ) {
    throw new ServiceError("Ungültige Kategorie", 400);
  }
  if (!quarter_id) {
    throw new ServiceError("Quartier erforderlich", 400);
  }

  const requiresOrg = category === "begleitung";

  const { data: task, error } = await supabase
    .from("youth_tasks")
    .insert({
      created_by: userId,
      quarter_id,
      title,
      description,
      category,
      risk_level: risk_level || "niedrig",
      requires_org: requiresOrg,
      estimated_minutes: estimated_minutes || null,
      points_reward: points_reward || 20,
      status: "open",
      moderation_status: "approved", // Bewohner-erstellte Aufgaben direkt freigegeben
    })
    .select()
    .single();

  if (error) {
    throw new ServiceError("Aufgabe konnte nicht erstellt werden", 500);
  }

  return { task };
}

/**
 * Einzelne Aufgabe laden
 */
export async function getYouthTask(supabase: SupabaseClient, taskId: string) {
  const { data: task, error } = await supabase
    .from("youth_tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (error || !task) {
    throw new ServiceError("Aufgabe nicht gefunden", 404);
  }

  return { task };
}

/**
 * Aufgabe aktualisieren — nur erlaubte Felder
 */
export async function updateYouthTask(
  supabase: SupabaseClient,
  taskId: string,
  body: Record<string, unknown>,
) {
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_TASK_UPDATE_FIELDS) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ServiceError("Keine Änderungen", 400);
  }

  const { data: task, error } = await supabase
    .from("youth_tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    throw new ServiceError("Aufgabe konnte nicht aktualisiert werden", 500);
  }

  return { task };
}

/**
 * Aufgabe annehmen — Zugangsstufe pruefen, Optimistic Locking
 */
export async function acceptYouthTask(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
) {
  // Prüfe Youth-Profil und Zugangs-Stufe
  const { data: profile } = await supabase
    .from("youth_profiles")
    .select("access_level")
    .eq("user_id", userId)
    .single();

  if (!profile || profile.access_level === "basis") {
    throw new ServiceError(
      'Du benötigst mindestens die Stufe "Erweitert", um Aufgaben anzunehmen.',
      403,
    );
  }

  // Prüfe ob Aufgabe verfügbar
  const { data: task } = await supabase
    .from("youth_tasks")
    .select("id, status, created_by")
    .eq("id", taskId)
    .single();

  if (!task) {
    throw new ServiceError("Aufgabe nicht gefunden", 404);
  }
  if (task.status !== "open") {
    throw new ServiceError("Aufgabe ist nicht mehr verfügbar", 409);
  }
  if (task.created_by === userId) {
    throw new ServiceError(
      "Du kannst deine eigene Aufgabe nicht annehmen",
      400,
    );
  }

  // Aufgabe annehmen
  const { data: updated, error } = await supabase
    .from("youth_tasks")
    .update({
      status: "accepted",
      accepted_by: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("status", "open") // Optimistic Locking
    .select()
    .single();

  if (error || !updated) {
    throw new ServiceError("Aufgabe konnte nicht angenommen werden", 409);
  }

  return { task: updated };
}

/**
 * Aufgabe abschliessen — Punkte buchen
 */
export async function completeYouthTask(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
) {
  // Aufgabe laden
  const { data: task } = await supabase
    .from("youth_tasks")
    .select("id, status, accepted_by, created_by, points_reward, category")
    .eq("id", taskId)
    .single();

  if (!task) {
    throw new ServiceError("Aufgabe nicht gefunden", 404);
  }
  if (task.status !== "accepted") {
    throw new ServiceError("Aufgabe muss zuerst angenommen sein", 400);
  }

  // Nur der Ersteller oder der Bearbeiter kann abschliessen
  const isCreator = task.created_by === userId;
  const isAcceptor = task.accepted_by === userId;

  if (!isCreator && !isAcceptor) {
    throw new ServiceError(
      "Nur Ersteller oder Bearbeiter können die Aufgabe abschließen",
      403,
    );
  }

  // Aufgabe als erledigt markieren
  const updates: Record<string, unknown> = {
    status: "completed",
    completed_at: new Date().toISOString(),
  };

  if (isCreator) {
    updates.confirmed_by_creator = true;
  }

  const { error: updateError } = await supabase
    .from("youth_tasks")
    .update(updates)
    .eq("id", taskId);

  if (updateError) {
    throw new ServiceError("Aufgabe konnte nicht abgeschlossen werden", 500);
  }

  // Punkte buchen fuer den Bearbeiter
  if (task.accepted_by) {
    const bonus = task.category === "technik" ? 10 : 0;
    const totalPoints = task.points_reward + bonus;

    await supabase.from("youth_points_ledger").insert({
      user_id: task.accepted_by,
      points: totalPoints,
      source_type: "task",
      source_id: task.id,
      description: `Aufgabe erledigt: +${task.points_reward}${bonus > 0 ? ` (+${bonus} Technik-Bonus)` : ""} Punkte`,
    });
  }

  return { success: true, points_awarded: task.points_reward };
}

// --- Report-Service ---

/**
 * Inhalt melden — Auto-Sperre nach 3 Meldungen
 */
export async function reportYouthContent(
  supabase: SupabaseClient,
  userId: string,
  body: ReportBody,
) {
  const { target_type, target_id, reason } = body;

  if (!target_type || !target_id || !reason) {
    throw new ServiceError(
      "target_type, target_id und reason erforderlich",
      400,
    );
  }

  if (
    !VALID_TARGET_TYPES.includes(
      target_type as (typeof VALID_TARGET_TYPES)[number],
    )
  ) {
    throw new ServiceError("Ungültiger target_type", 400);
  }

  // Meldung in Moderation-Log schreiben
  const { error: insertError } = await supabase
    .from("youth_moderation_log")
    .insert({
      target_type,
      target_id,
      action: "flagged",
      reason,
      moderator_id: userId,
    });

  if (insertError) {
    throw new ServiceError("Meldung konnte nicht gespeichert werden", 500);
  }

  // Auto-Sperre pruefen: 3 Meldungen gegen dasselbe Ziel → suspended
  const { count } = await supabase
    .from("youth_moderation_log")
    .select("id", { count: "exact", head: true })
    .eq("target_type", target_type)
    .eq("target_id", target_id)
    .eq("action", "flagged");

  let autoSuspended = false;
  if (count && count >= AUTO_SUSPEND_THRESHOLD) {
    await supabase.from("youth_moderation_log").insert({
      target_type,
      target_id,
      action: "suspended",
      reason: `Automatische Sperre nach ${count} Meldungen`,
      moderator_id: userId,
    });
    autoSuspended = true;
  }

  return { reported: true, auto_suspended: autoSuspended };
}

// --- Register-Service ---

/**
 * Jugend-Profil registrieren — Altersgruppe berechnen, Badge vergeben
 */
export async function registerYouthProfile(
  supabase: SupabaseClient,
  user: RegisterUser,
  body: RegisterBody,
) {
  const { birth_year, quarter_id } = body;

  if (!birth_year || typeof birth_year !== "number") {
    throw new ServiceError("Geburtsjahr erforderlich", 400);
  }

  const ageGroup = calculateAgeGroup(birth_year);
  if (!ageGroup) {
    throw new ServiceError(
      "Das Jugend-Modul ist für 14- bis 17-Jährige verfügbar.",
      400,
    );
  }

  const accessLevel = getAccessLevel(ageGroup, false);
  const phoneHash = user.phone
    ? createHash("sha256").update(user.phone).digest("hex")
    : "";

  // Duplikat-Pruefung
  const { data: existing } = await supabase
    .from("youth_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    throw new ServiceError("Jugend-Profil existiert bereits", 409);
  }

  const { data: profile, error } = await supabase
    .from("youth_profiles")
    .insert({
      user_id: user.id,
      birth_year,
      age_group: ageGroup,
      access_level: accessLevel,
      phone_hash: phoneHash,
      quarter_id: quarter_id || null,
    })
    .select()
    .single();

  if (error) {
    throw new ServiceError("Registrierung fehlgeschlagen", 500);
  }

  // "Quartiers-Neuling" Badge automatisch vergeben
  const { data: badge } = await supabase
    .from("youth_badges")
    .select("id")
    .eq("slug", "quartiers-neuling")
    .single();

  if (badge) {
    await supabase.from("youth_earned_badges").insert({
      user_id: user.id,
      badge_id: badge.id,
    });

    await supabase.from("youth_points_ledger").insert({
      user_id: user.id,
      points: 10,
      source_type: "badge",
      source_id: badge.id,
      description: "Willkommens-Bonus: Quartiers-Neuling",
    });
  }

  return { profile, access_level: accessLevel, age_group: ageGroup };
}

// --- Consent-Services ---

/**
 * Elternfreigabe verifizieren — Guardian klickt SMS-Link
 * WICHTIG: Guardian ist NICHT authentifiziert (oeffentlicher SMS-Link).
 * Daher muss ein Service-Client (adminDb) fuer alle DB-Operationen verwendet werden,
 * da RLS auf youth_guardian_consents nur auth.uid() = youth_user_id erlaubt.
 */
export async function verifyYouthConsent(
  adminDb: SupabaseClient,
  body: ConsentVerifyBody,
  headers: RequestHeaders,
) {
  const { token, guardian_name } = body;
  if (!token || !guardian_name) {
    throw new ServiceError("Token und Name erforderlich", 400);
  }

  const tokenHash = hashToken(token);

  // Consent-Eintrag finden — NUR pending, genau 1 Treffer
  const { data: consent, error: lookupError } = await adminDb
    .from("youth_guardian_consents")
    .select("id, youth_user_id, token_expires_at, status")
    .eq("token_hash", tokenHash)
    .eq("status", "pending")
    .single();

  if (lookupError || !consent) {
    throw new ServiceError(
      "Ungültiger oder bereits verwendeter Freigabe-Link",
      404,
    );
  }

  // Abgelaufene Tokens sauber auf expired setzen
  if (isTokenExpired(consent.token_expires_at)) {
    const { error: expireError } = await adminDb
      .from("youth_guardian_consents")
      .update({ status: "expired" })
      .eq("id", consent.id);
    if (expireError) {
      console.error("[consent/verify] Fehler beim Expire-Update:", expireError);
    }
    throw new ServiceError(
      "Der Freigabe-Link ist abgelaufen. Bitte fordern Sie einen neuen an.",
      410,
    );
  }

  // Consent erteilen — Error-Check!
  const { error: grantError } = await adminDb
    .from("youth_guardian_consents")
    .update({
      status: "granted",
      guardian_name: encryptField(guardian_name),
      granted_via: "sms_link",
      granted_at: new Date().toISOString(),
      granted_ip: encryptField(headers.ip),
      granted_user_agent: encryptField(headers.userAgent),
    })
    .eq("id", consent.id);

  if (grantError) {
    throw new ServiceError("Freigabe konnte nicht gespeichert werden", 500);
  }

  // Youth-Profil auf 'freigeschaltet' upgraden — erst NACH erfolgreichem Consent-Update
  const { error: upgradeError } = await adminDb
    .from("youth_profiles")
    .update({ access_level: "freigeschaltet" })
    .eq("user_id", consent.youth_user_id);

  if (upgradeError) {
    throw new ServiceError("Profil-Upgrade fehlgeschlagen", 500);
  }

  return { success: true, message: "Freigabe erteilt" };
}

/**
 * Elternfreigabe-Token per SMS senden
 */
export async function sendYouthConsentSms(
  supabase: SupabaseClient,
  user: ConsentSendUser,
  guardianPhone: string,
) {
  if (!guardianPhone || !guardianPhone.startsWith("+")) {
    throw new ServiceError(
      "Gültige Telefonnummer mit Landesvorwahl erforderlich",
      400,
    );
  }

  // Prüfe ob Youth-Profil existiert
  const { data: profile } = await supabase
    .from("youth_profiles")
    .select("id, access_level")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    throw new ServiceError("Kein Jugend-Profil gefunden", 404);
  }

  // Rate-Limit: max 3 Token-Sendungen pruefen
  const guardianPhoneHash = createHash("sha256")
    .update(guardianPhone)
    .digest("hex");
  const { data: existingConsent } = await supabase
    .from("youth_guardian_consents")
    .select("id, token_send_count, status")
    .eq("youth_user_id", user.id)
    .eq("status", "pending")
    .single();

  if (existingConsent && existingConsent.token_send_count >= MAX_TOKEN_SENDS) {
    throw new ServiceError(
      "Maximale Anzahl Sendungen erreicht. Bitte warten Sie 72 Stunden.",
      429,
    );
  }

  // Token generieren
  const token = generateConsentToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  ).toISOString();

  if (existingConsent) {
    // Bestehenden Eintrag aktualisieren (neuer Token, Zaehler erhoehen)
    await supabase
      .from("youth_guardian_consents")
      .update({
        token_hash: tokenHash,
        token_expires_at: expiresAt,
        token_last_sent_at: new Date().toISOString(),
        token_send_count: existingConsent.token_send_count + 1,
        guardian_phone_hash: guardianPhoneHash,
      })
      .eq("id", existingConsent.id);
  } else {
    // Neuen Eintrag erstellen
    await supabase.from("youth_guardian_consents").insert({
      youth_user_id: user.id,
      guardian_phone_hash: guardianPhoneHash,
      token_hash: tokenHash,
      token_expires_at: expiresAt,
      token_last_sent_at: new Date().toISOString(),
      token_send_count: 1,
      consent_text_version: CONSENT_TEXT_VERSION,
      status: "pending",
    });
  }

  // SMS senden
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://quartierapp.de";
  const consentUrl = `${appUrl}/jugend/freigabe/${token}`;

  const userName = user.user_metadata?.first_name || "Ihr Kind";

  await sendSms({
    phone: guardianPhone,
    message: `Hallo! ${userName} nutzt die QuartierApp und wünscht sich Zugang zu weiteren Funktionen. Als Erziehungsberechtigte/r können Sie das hier freigeben: ${consentUrl} - Der Link ist 72 Stunden gültig. Vielen Dank! Ihr QuartierApp-Team`,
  });

  return { sent: true };
}

/**
 * Elternfreigabe widerrufen — Profil zurueckstufen
 * Reihenfolge: 1. Consent revoken → 2. erst bei Erfolg Profil downgraden
 * Consent und Profil bleiben konsistent: kein Downgrade ohne erfolgreichen Revoke.
 */
export async function revokeYouthConsent(
  supabase: SupabaseClient,
  body: ConsentRevokeBody,
  headers: RequestHeaders,
) {
  const { youth_user_id, revoked_via } = body;

  // Aktiven Consent finden
  const { data: consent, error: lookupError } = await supabase
    .from("youth_guardian_consents")
    .select("id")
    .eq("youth_user_id", youth_user_id)
    .eq("status", "granted")
    .single();

  if (lookupError || !consent) {
    throw new ServiceError("Keine aktive Freigabe gefunden", 404);
  }

  // Schritt 1: Consent widerrufen — MUSS erfolgreich sein vor Profil-Downgrade
  const { error: revokeError } = await supabase
    .from("youth_guardian_consents")
    .update({
      status: "revoked",
      revoked_via: revoked_via || "sms_link",
      revoked_at: new Date().toISOString(),
      revoked_ip: encryptField(headers.ip),
      revoked_user_agent: encryptField(headers.userAgent),
    })
    .eq("id", consent.id);

  if (revokeError) {
    throw new ServiceError("Widerruf konnte nicht gespeichert werden", 500);
  }

  // Schritt 2: Profil zurueckstufen — erst NACH erfolgreichem Revoke
  const { data: profile, error: profileLookupError } = await supabase
    .from("youth_profiles")
    .select("age_group")
    .eq("user_id", youth_user_id)
    .single();

  if (profileLookupError || !profile) {
    throw new ServiceError("Jugend-Profil nicht gefunden", 404);
  }

  const newLevel = getAccessLevel(
    profile.age_group as "u16" | "16_17",
    false,
  );

  const { error: downgradeError } = await supabase
    .from("youth_profiles")
    .update({ access_level: newLevel })
    .eq("user_id", youth_user_id);

  if (downgradeError) {
    throw new ServiceError("Profil-Downgrade fehlgeschlagen", 500);
  }

  return { success: true, new_level: newLevel };
}
