// modules/care/services/sos.service.ts
// Nachbar.io — SOS-Business-Logik: Auslösung + Abfrage von SOS-Alerts

import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/care/audit";
import { sendCareNotification } from "@/lib/care/notifications";
import { canAccessFeature } from "@/lib/care/permissions";
import { requireCareAccess } from "@/lib/care/api-helpers";
import {
  encryptField,
  decryptFields,
  CARE_SOS_ALERTS_ENCRYPTED_FIELDS,
  CARE_SOS_RESPONSES_ENCRYPTED_FIELDS,
} from "@/lib/care/field-encryption";
import { CARE_SOS_CATEGORIES, ESCALATION_LEVELS } from "@/lib/care/constants";
import { createCareLogger } from "@/lib/care/logger";
import { checkCareConsent } from "@/lib/care/consent";
import { getUserQuarterId } from "@/lib/quarters/helpers";
import { ServiceError } from "@/lib/services/service-error";
import type { CareSosCategory, CareSosSource } from "@/lib/care/types";

// Aktive Status-Werte für die Standard-GET-Anfrage
const DEFAULT_ACTIVE_STATUSES = [
  "triggered",
  "notified",
  "accepted",
  "helper_enroute",
  "escalated",
] as const;

const VALID_SOURCES: CareSosSource[] = ["app", "device", "checkin_timeout"];

// --- triggerSos: SOS auslösen ---

interface TriggerSosParams {
  userId: string;
  category?: CareSosCategory;
  notes?: string;
  source?: CareSosSource;
}

export async function triggerSos(
  supabase: SupabaseClient,
  params: TriggerSosParams,
) {
  const log = createCareLogger("care/sos/POST");
  const { userId, category, notes, source = "app" } = params;

  // Art. 9 DSGVO: Einwilligung prüfen
  const hasConsent = await checkCareConsent(supabase, userId, "sos");
  if (!hasConsent) {
    throw new ServiceError("Einwilligung erforderlich", 403);
  }

  // source validieren
  if (!VALID_SOURCES.includes(source)) {
    throw new ServiceError(
      `Ungültige Quelle: ${source}. Erlaubt: ${VALID_SOURCES.join(", ")}`,
      400,
    );
  }

  // Kategorie ist Pflichtfeld
  if (!category) {
    throw new ServiceError("Kategorie ist erforderlich", 400);
  }

  // Kategorie gegen erlaubte Werte prüfen
  const validCategory = CARE_SOS_CATEGORIES.find((c) => c.id === category);
  if (!validCategory) {
    throw new ServiceError(
      `Ungültige Kategorie: ${category}. Erlaubt: ${CARE_SOS_CATEGORIES.map((c) => c.id).join(", ")}`,
      400,
    );
  }

  // Feature-Gate: medical_emergency immer erlaubt; alle anderen benötigen sos_all
  const featureKey =
    category === "medical_emergency" ? "medical_emergency_sos" : "sos_all";
  const hasAccess = await canAccessFeature(supabase, userId, featureKey);
  if (!hasAccess) {
    throw new ServiceError(
      "Ihr Abo-Plan unterstützt diese SOS-Kategorie nicht. Bitte upgraden Sie Ihren Plan.",
      403,
      featureKey,
    );
  }

  // Quartier-ID des Nutzers ermitteln
  const quarterId = await getUserQuarterId(supabase, userId);

  // SOS-Alert in der Datenbank anlegen (notes verschlüsselt — Art. 9 DSGVO)
  const { data: alert, error: insertError } = await supabase
    .from("care_sos_alerts")
    .insert({
      senior_id: userId,
      category,
      status: "triggered",
      current_escalation_level: 1,
      escalated_at: [],
      notes: encryptField(notes ?? null),
      source,
      quarter_id: quarterId,
    })
    .select()
    .single();

  if (insertError || !alert) {
    log.error("db_insert_failed", insertError, { userId, category });
    log.done(500);
    throw new ServiceError("SOS konnte nicht ausgelöst werden", 500);
  }

  log.info("sos_triggered", {
    userId,
    alertId: alert.id,
    category,
    source,
    isEmergency: validCategory.isEmergency,
  });

  // Audit-Log schreiben (nicht-blockierend)
  try {
    await writeAuditLog(supabase, {
      seniorId: userId,
      actorId: userId,
      eventType: "sos_triggered",
      referenceType: "care_sos_alerts",
      referenceId: alert.id,
      metadata: { category, source, isEmergency: validCategory.isEmergency },
    });
  } catch (_auditError) {
    // Audit-Fehler blockiert nicht den SOS-Prozess
    log.warn("audit_log_failed", { alertId: alert.id });
  }

  // Level-1-Helfer (Nachbarn) benachrichtigen
  try {
    const { data: level1Helpers, error: helpersError } = await supabase
      .from("care_helpers")
      .select("user_id")
      .eq("role", ESCALATION_LEVELS[0].role)
      .eq("verification_status", "verified")
      .contains("assigned_seniors", [userId]);

    if (helpersError) {
      log.error("helpers_query_failed", helpersError, { alertId: alert.id });
    } else if (level1Helpers && level1Helpers.length > 0) {
      log.info("helpers_notified", {
        alertId: alert.id,
        helperCount: level1Helpers.length,
        level: 1,
      });
      const notificationTitle = validCategory.isEmergency
        ? `NOTFALL: ${validCategory.label}`
        : `SOS: ${validCategory.label}`;
      const notificationBody = `Ihr Nachbar braucht Hilfe. Bitte reagieren Sie jetzt.`;

      const notificationChannels = [...ESCALATION_LEVELS[0].channels] as (
        | "push"
        | "in_app"
      )[];
      const notifyPromises = level1Helpers.map((helper) =>
        sendCareNotification(supabase, {
          userId: helper.user_id,
          type: "care_sos",
          title: notificationTitle,
          body: notificationBody,
          referenceId: alert.id,
          referenceType: "care_sos_alerts",
          url: `/care/sos/${alert.id}`,
          channels: notificationChannels,
        }),
      );

      await Promise.all(notifyPromises);

      // Alert-Status auf 'notified' aktualisieren
      const { error: updateError } = await supabase
        .from("care_sos_alerts")
        .update({ status: "notified" })
        .eq("id", alert.id);

      if (updateError) {
        log.error("status_update_failed", updateError, {
          alertId: alert.id,
          targetStatus: "notified",
        });
      } else {
        alert.status = "notified";
      }
    }
  } catch (notifyError) {
    // Benachrichtigungsfehler blockiert nicht die SOS-Antwort
    log.error("notification_failed", notifyError, { alertId: alert.id });
  }

  log.done(201, { alertId: alert.id, status: alert.status });
  return decryptFields(alert, CARE_SOS_ALERTS_ENCRYPTED_FIELDS);
}

// --- listSosAlerts: Aktive SOS-Alerts abrufen ---

interface ListSosAlertsParams {
  userId: string;
  statusFilter?: string;
  seniorId?: string;
}

export async function listSosAlerts(
  supabase: SupabaseClient,
  params: ListSosAlertsParams,
) {
  const { userId, statusFilter: statusParam, seniorId } = params;

  // Status-Filter: Komma-getrennte Liste oder Standard-Aktivstatus
  const statusFilter: string[] = statusParam
    ? statusParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [...DEFAULT_ACTIVE_STATUSES];

  // SOS-Alerts mit Joins auf Antworten und Senioren-Profil abrufen
  let query = supabase
    .from("care_sos_alerts")
    .select(
      `*,
      responses:care_sos_responses(
        id,
        helper_id,
        response_type,
        eta_minutes,
        note,
        created_at,
        helper:users(display_name, avatar_url)
      ),
      senior:users!care_sos_alerts_senior_id_fkey(
        display_name,
        avatar_url
      )`,
    )
    .in("status", statusFilter)
    .order("created_at", { ascending: false })
    .limit(50);

  // SICHERHEIT: Zugriffskontrolle — ohne senior_id nur eigene Alerts oder als Helfer zugeordnete
  if (seniorId) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) throw new ServiceError("Kein Zugriff auf diesen Senior", 403);
    query = query.eq("senior_id", seniorId);
  } else {
    // Prüfe ob User Admin ist
    const { data: userData } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", userId)
      .single();
    if (!userData?.is_admin) {
      // Nicht-Admin: Nur eigene Alerts + Alerts von zugeordneten Senioren
      const { data: helperData } = await supabase
        .from("care_helpers")
        .select("assigned_seniors")
        .eq("user_id", userId)
        .eq("verification_status", "verified")
        .maybeSingle();

      const assignedSeniors: string[] = helperData?.assigned_seniors ?? [];
      const allowedIds = [userId, ...assignedSeniors];
      query = query.in("senior_id", allowedIds);
    }
    // Admins sehen alle Alerts (kein Filter)
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      JSON.stringify({
        level: "error",
        route: "care/sos/GET",
        event: "alerts_query_failed",
        error: error.message,
      }),
    );
    throw new ServiceError("SOS-Alerts konnten nicht geladen werden", 500);
  }

  // SOS-Notes und Response-Notes entschlüsseln (Art. 9 DSGVO)
  const decryptedAlerts = (data ?? []).map((alert: Record<string, unknown>) => {
    const decryptedAlert = decryptFields(
      alert,
      CARE_SOS_ALERTS_ENCRYPTED_FIELDS,
    );
    if (Array.isArray(decryptedAlert.responses)) {
      decryptedAlert.responses = (
        decryptedAlert.responses as Record<string, unknown>[]
      ).map((resp) => decryptFields(resp, CARE_SOS_RESPONSES_ENCRYPTED_FIELDS));
    }
    return decryptedAlert;
  });

  return decryptedAlerts;
}
