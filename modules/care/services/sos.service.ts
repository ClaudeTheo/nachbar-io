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
import {
  getNextEscalationLevel,
  getEscalationMeta,
} from "@/lib/care/escalation";
import { ServiceError } from "@/lib/services/service-error";
import type {
  CareSosCategory,
  CareSosSource,
  CareSosResponseType,
  CareSosStatus,
} from "@/lib/care/types";

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

// --- getSosAlert: Einzelnen SOS-Alert mit Antworten und Senior-Profil abrufen ---

export async function getSosAlert(
  supabase: SupabaseClient,
  userId: string,
  alertId: string,
) {
  // Alert mit Antworten (inkl. Helfer-Info) und Senior-Profil abfragen
  const { data: alert, error } = await supabase
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
    .eq("id", alertId)
    .single();

  if (error || !alert) {
    if (error?.code === "PGRST116") {
      throw new ServiceError("SOS-Alert nicht gefunden", 404);
    }
    console.error("[care/sos/id] Alert-Abfrage fehlgeschlagen:", error);
    throw new ServiceError("SOS-Alert konnte nicht geladen werden", 500);
  }

  // SICHERHEIT: Zugriffsprüfung — nur Senior, zugeordnete Helfer oder Admin
  if (alert.senior_id !== userId) {
    const role = await requireCareAccess(supabase, alert.senior_id);
    if (!role) throw new ServiceError("Kein Zugriff auf diesen SOS-Alert", 403);
  }

  // SOS-Notes und Response-Notes entschlüsseln (Art. 9 DSGVO)
  const decryptedAlert = decryptFields(alert, CARE_SOS_ALERTS_ENCRYPTED_FIELDS);
  if (Array.isArray(decryptedAlert.responses)) {
    decryptedAlert.responses = (
      decryptedAlert.responses as Record<string, unknown>[]
    ).map((resp) => decryptFields(resp, CARE_SOS_RESPONSES_ENCRYPTED_FIELDS));
  }

  return decryptedAlert;
}

// --- updateSosStatus: SOS-Alert schließen oder abbrechen ---

// Erlaubte Status-Übergänge
const ALLOWED_STATUS_TRANSITIONS: CareSosStatus[] = ["resolved", "cancelled"];

interface UpdateSosStatusParams {
  status?: string;
  notes?: string;
}

export async function updateSosStatus(
  supabase: SupabaseClient,
  userId: string,
  alertId: string,
  body: UpdateSosStatusParams,
) {
  const { status, notes } = body;

  // Status-Feld ist Pflicht
  if (!status) {
    throw new ServiceError("Status ist erforderlich", 400);
  }

  // Nur 'resolved' und 'cancelled' sind gültige Übergänge für diesen Endpunkt
  if (!ALLOWED_STATUS_TRANSITIONS.includes(status as CareSosStatus)) {
    throw new ServiceError(
      `Ungültiger Status: "${status}". Erlaubt: ${ALLOWED_STATUS_TRANSITIONS.join(", ")}`,
      400,
    );
  }

  const newStatus = status as "resolved" | "cancelled";

  // SICHERHEIT: Zugriffsprüfung — nur Senior, zugeordnete Helfer oder Admin
  const { data: alertCheck } = await supabase
    .from("care_sos_alerts")
    .select("senior_id")
    .eq("id", alertId)
    .single();

  if (!alertCheck) {
    throw new ServiceError("SOS-Alert nicht gefunden", 404);
  }

  if (alertCheck.senior_id !== userId) {
    const role = await requireCareAccess(supabase, alertCheck.senior_id);
    if (!role) throw new ServiceError("Kein Zugriff auf diesen SOS-Alert", 403);
  }

  // Update-Objekt aufbauen — bei 'resolved' Resolver und Zeitstempel setzen
  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    ...(notes !== undefined && { notes: encryptField(notes) }),
  };

  if (newStatus === "resolved") {
    updatePayload.resolved_by = userId;
    updatePayload.resolved_at = new Date().toISOString();
  }

  // Alert in der Datenbank aktualisieren
  const { data: updatedAlert, error: updateError } = await supabase
    .from("care_sos_alerts")
    .update(updatePayload)
    .eq("id", alertId)
    .select()
    .single();

  if (updateError || !updatedAlert) {
    if (updateError?.code === "PGRST116") {
      throw new ServiceError("SOS-Alert nicht gefunden", 404);
    }
    console.error("[care/sos/id] Status-Update fehlgeschlagen:", updateError);
    throw new ServiceError("SOS-Alert konnte nicht aktualisiert werden", 500);
  }

  // Audit-Log schreiben: Ereignistyp je nach neuem Status
  const auditEventType =
    newStatus === "resolved" ? "sos_resolved" : "sos_cancelled";
  try {
    await writeAuditLog(supabase, {
      seniorId: updatedAlert.senior_id,
      actorId: userId,
      eventType: auditEventType,
      referenceType: "care_sos_alerts",
      referenceId: alertId,
      metadata: { newStatus, notes: notes ?? null },
    });
  } catch (auditError) {
    // Audit-Fehler blockiert nicht die Antwort
    console.error(
      "[care/sos/id] Audit-Log konnte nicht geschrieben werden:",
      auditError,
    );
  }

  // Entschlüsselt zurückgeben
  return decryptFields(updatedAlert, CARE_SOS_ALERTS_ENCRYPTED_FIELDS);
}

// --- respondToSos: Als Helfer auf einen SOS-Alert reagieren ---

// Alle erlaubten Reaktionstypen
const VALID_RESPONSE_TYPES: CareSosResponseType[] = [
  "accepted",
  "declined",
  "arrived",
  "completed",
];

interface RespondToSosParams {
  response_type?: CareSosResponseType;
  eta_minutes?: number;
  note?: string;
}

export async function respondToSos(
  supabase: SupabaseClient,
  userId: string,
  alertId: string,
  body: RespondToSosParams,
) {
  const { response_type, eta_minutes, note } = body;

  // Reaktionstyp ist Pflichtfeld
  if (!response_type) {
    throw new ServiceError(
      "Reaktionstyp (response_type) ist erforderlich",
      400,
    );
  }

  // Reaktionstyp gegen erlaubte Werte prüfen
  if (!VALID_RESPONSE_TYPES.includes(response_type)) {
    throw new ServiceError(
      `Ungültiger Reaktionstyp: "${response_type}". Erlaubt: ${VALID_RESPONSE_TYPES.join(", ")}`,
      400,
    );
  }

  // Alert abrufen, um senior_id für Benachrichtigungen zu ermitteln
  const { data: alert, error: alertError } = await supabase
    .from("care_sos_alerts")
    .select("id, senior_id, status")
    .eq("id", alertId)
    .single();

  if (alertError || !alert) {
    if (alertError?.code === "PGRST116") {
      throw new ServiceError("SOS-Alert nicht gefunden", 404);
    }
    console.error(
      "[care/sos/respond] Alert-Abfrage fehlgeschlagen:",
      alertError,
    );
    throw new ServiceError("SOS-Alert konnte nicht geladen werden", 500);
  }

  // SICHERHEIT: Prüfe ob der Nutzer ein verifizierter Helfer für diesen Senior ist
  if (alert.senior_id !== userId) {
    const { data: helperCheck } = await supabase
      .from("care_helpers")
      .select("id, assigned_seniors")
      .eq("user_id", userId)
      .eq("verification_status", "verified")
      .maybeSingle();

    const { data: adminCheck } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", userId)
      .single();
    const isAssignedHelper = helperCheck?.assigned_seniors?.includes(
      alert.senior_id,
    );

    if (!isAssignedHelper && !adminCheck?.is_admin) {
      throw new ServiceError(
        "Nur verifizierte Helfer dürfen auf SOS-Alerts reagieren",
        403,
      );
    }
  }

  // Reaktion in der Datenbank speichern
  const { data: response, error: insertError } = await supabase
    .from("care_sos_responses")
    .insert({
      sos_alert_id: alertId,
      helper_id: userId,
      response_type,
      eta_minutes: eta_minutes ?? null,
      note: encryptField(note ?? null),
    })
    .select()
    .single();

  if (insertError || !response) {
    console.error(
      "[care/sos/respond] Reaktion konnte nicht gespeichert werden:",
      insertError,
    );
    throw new ServiceError("Reaktion konnte nicht gespeichert werden", 500);
  }

  // Status-Update und Benachrichtigung je nach Reaktionstyp
  if (response_type === "accepted") {
    // Alert-Status auf 'accepted' setzen und Helfer als accepted_by eintragen
    const { error: updateError } = await supabase
      .from("care_sos_alerts")
      .update({
        status: "accepted",
        accepted_by: userId,
      })
      .eq("id", alertId);

    if (updateError) {
      console.error(
        '[care/sos/respond] Status-Update auf "accepted" fehlgeschlagen:',
        updateError,
      );
    }

    // Senior benachrichtigen: Hilfe ist unterwegs
    try {
      await sendCareNotification(supabase, {
        userId: alert.senior_id,
        type: "care_sos_response",
        title: "Hilfe ist unterwegs!",
        body: eta_minutes
          ? `Ein Helfer ist in ca. ${eta_minutes} Minuten bei Ihnen.`
          : "Ein Helfer hat Ihre SOS-Meldung angenommen und kommt zu Ihnen.",
        referenceId: alertId,
        referenceType: "care_sos_alerts",
        url: `/care/sos/${alertId}`,
        channels: ["push", "in_app"],
      });
    } catch (notifyError) {
      // Benachrichtigungsfehler blockiert nicht die Antwort
      console.error(
        "[care/sos/respond] Senior-Benachrichtigung fehlgeschlagen:",
        notifyError,
      );
    }

    // Audit-Log für Annahme schreiben
    try {
      await writeAuditLog(supabase, {
        seniorId: alert.senior_id,
        actorId: userId,
        eventType: "sos_accepted",
        referenceType: "care_sos_alerts",
        referenceId: alertId,
        metadata: { helperId: userId, etaMinutes: eta_minutes ?? null },
      });
    } catch (auditError) {
      console.error(
        "[care/sos/respond] Audit-Log konnte nicht geschrieben werden:",
        auditError,
      );
    }
  } else if (response_type === "arrived") {
    // Alert-Status auf 'helper_enroute' setzen (Helfer ist eingetroffen / unterwegs)
    const { error: updateError } = await supabase
      .from("care_sos_alerts")
      .update({ status: "helper_enroute" })
      .eq("id", alertId);

    if (updateError) {
      console.error(
        '[care/sos/respond] Status-Update auf "helper_enroute" fehlgeschlagen:',
        updateError,
      );
    }
  }

  // Entschlüsselt zurückgeben
  return decryptFields(response, CARE_SOS_RESPONSES_ENCRYPTED_FIELDS);
}

// --- escalateSos: SOS-Alert manuell eskalieren ---

export async function escalateSos(
  supabase: SupabaseClient,
  userId: string,
  alertId: string,
) {
  // Aktuellen Alert abrufen, um Eskalationsstufe und Senior-ID zu ermitteln
  const { data: alert, error: alertError } = await supabase
    .from("care_sos_alerts")
    .select(
      "id, senior_id, status, current_escalation_level, escalated_at, category",
    )
    .eq("id", alertId)
    .single();

  if (alertError || !alert) {
    if (alertError?.code === "PGRST116") {
      throw new ServiceError("SOS-Alert nicht gefunden", 404);
    }
    console.error(
      "[care/sos/escalate] Alert-Abfrage fehlgeschlagen:",
      alertError,
    );
    throw new ServiceError("SOS-Alert konnte nicht geladen werden", 500);
  }

  // SICHERHEIT: Nur Senior, zugeordnete Helfer oder Admin dürfen eskalieren
  if (alert.senior_id !== userId) {
    const role = await requireCareAccess(supabase, alert.senior_id);
    if (!role) throw new ServiceError("Kein Zugriff auf diesen SOS-Alert", 403);
  }

  const fromLevel: number = alert.current_escalation_level ?? 1;

  // Nächste Eskalationsstufe ermitteln — null bedeutet maximale Stufe erreicht
  const toLevel = getNextEscalationLevel(fromLevel);
  if (toLevel === null) {
    throw new ServiceError(
      "Maximale Eskalationsstufe bereits erreicht. Weitere Eskalation nicht möglich.",
      400,
    );
  }

  // Neuen Eskalations-Zeitstempel ans Array anhängen
  const existingEscalatedAt: string[] = Array.isArray(alert.escalated_at)
    ? alert.escalated_at
    : [];
  const updatedEscalatedAt = [...existingEscalatedAt, new Date().toISOString()];

  // Alert aktualisieren: neue Stufe, erweitertes Zeitstempel-Array, Status auf 'escalated'
  const { data: updatedAlert, error: updateError } = await supabase
    .from("care_sos_alerts")
    .update({
      current_escalation_level: toLevel,
      escalated_at: updatedEscalatedAt,
      status: "escalated",
    })
    .eq("id", alertId)
    .select()
    .single();

  if (updateError || !updatedAlert) {
    console.error(
      "[care/sos/escalate] Alert-Update fehlgeschlagen:",
      updateError,
    );
    throw new ServiceError("Eskalation konnte nicht gespeichert werden", 500);
  }

  // Metadaten der neuen Eskalationsstufe abrufen (Label, Rolle, Kanäle)
  const escalationMeta = getEscalationMeta(toLevel);

  if (escalationMeta) {
    // Stufe 4: Kein konkreter Helfer — Admin-Alert senden
    if (escalationMeta.role === null) {
      try {
        await sendCareNotification(supabase, {
          // Admin-Alert: userId wird intern ignoriert, da alle Admins benachrichtigt werden
          userId: alert.senior_id,
          type: "care_escalation",
          title: `[ESKALATION Stufe 4] SOS-Alert`,
          body: `SOS-Alert ${alertId} hat maximale Eskalationsstufe erreicht. Sofortige Intervention erforderlich.`,
          referenceId: alertId,
          referenceType: "care_sos_alerts",
          url: `/care/sos/${alertId}`,
          channels: ["admin_alert"],
        });
      } catch (notifyError) {
        console.error(
          "[care/sos/escalate] Admin-Benachrichtigung fehlgeschlagen:",
          notifyError,
        );
      }
    } else {
      // Stufe 1-3: Alle Helfer der entsprechenden Rolle benachrichtigen
      try {
        const { data: helpers, error: helpersError } = await supabase
          .from("care_helpers")
          .select("user_id")
          .eq("role", escalationMeta.role)
          .eq("verification_status", "verified")
          .contains("assigned_seniors", [alert.senior_id]);

        if (helpersError) {
          console.error(
            "[care/sos/escalate] Helfer-Abfrage fehlgeschlagen:",
            helpersError,
          );
        } else if (helpers && helpers.length > 0) {
          // Kanäle aus den Metadaten als mutable Array übernehmen
          const notificationChannels = [...escalationMeta.channels] as (
            | "push"
            | "in_app"
            | "sms"
            | "voice"
            | "admin_alert"
          )[];

          const notifyPromises = helpers.map((helper) =>
            sendCareNotification(supabase, {
              userId: helper.user_id,
              type: "care_escalation",
              title: `SOS-Eskalation Stufe ${toLevel}: ${escalationMeta.label}`,
              body: `Ein SOS-Alert wurde auf Stufe ${toLevel} eskaliert. Bitte reagieren Sie sofort.`,
              referenceId: alertId,
              referenceType: "care_sos_alerts",
              url: `/care/sos/${alertId}`,
              channels: notificationChannels,
            }),
          );

          await Promise.all(notifyPromises);
        }
      } catch (notifyError) {
        // Benachrichtigungsfehler blockiert nicht die Eskalationsantwort
        console.error(
          "[care/sos/escalate] Helfer-Benachrichtigung fehlgeschlagen:",
          notifyError,
        );
      }
    }
  }

  // Audit-Log schreiben: manuelle Eskalation dokumentieren
  try {
    await writeAuditLog(supabase, {
      seniorId: alert.senior_id,
      actorId: userId,
      eventType: "sos_escalated",
      referenceType: "care_sos_alerts",
      referenceId: alertId,
      metadata: { fromLevel, toLevel, manual: true },
    });
  } catch (auditError) {
    console.error(
      "[care/sos/escalate] Audit-Log konnte nicht geschrieben werden:",
      auditError,
    );
  }

  return updatedAlert;
}
