// modules/care/services/heartbeat-escalation.service.ts
// Nachbar.io — Lebenszeichen-Eskalation Service (Phase 1: 2-Stufen-Modell)
// Design-Doc 2026-04-10 Abschnitt 4.5:
//   0-24h ok   -> null
//   24h-48h    -> reminder_24h (sanfte Erinnerung an Bewohner)
//   > 48h      -> alert_48h (Benachrichtigung an eingeladene Angehoerige)

import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/care/audit";
import { sendCareNotification } from "@/lib/care/notifications";
import { HEARTBEAT_ESCALATION } from "@/lib/care/constants";
import { writeCronHeartbeat } from "@/lib/care/cron-heartbeat";
import { ServiceError } from "@/lib/services/service-error";
import type { EscalationStage } from "@/lib/care/types";
import { getUserQuarterId } from "@/lib/quarters/helpers";
import {
  checkActiveHeatWarning,
  getHeatAwareEscalationStage,
  buildHeatAlertBody,
  type HeatWarningInfo,
} from "@/lib/care/heat-warning-check";

export interface HeartbeatEscalationResult {
  processed: number;
  reminder: number;
  alert: number;
  heatEscalated: number;
  resolved: number;
  timestamp: string;
}

/** Berechnet die Eskalationsstufe basierend auf Stunden seit letztem Heartbeat */
export function getEscalationStage(hoursAgo: number): EscalationStage | null {
  if (hoursAgo <= HEARTBEAT_ESCALATION.reminder_after_hours) return null;
  if (hoursAgo <= HEARTBEAT_ESCALATION.alert_after_hours) return "reminder_24h";
  return "alert_48h";
}

/** Heartbeat-Eskalation für alle aktiven Bewohner durchführen */
export async function runHeartbeatEscalation(
  supabase: SupabaseClient,
): Promise<HeartbeatEscalationResult> {
  const now = new Date();

  // Alle aktiven Caregiver-Links mit heartbeat_visible=true laden
  // Gibt uns die Bewohner-IDs, für die Heartbeat-Monitoring aktiv ist
  const { data: activeLinks, error: linksError } = await supabase
    .from("caregiver_links")
    .select("resident_id, caregiver_id")
    .eq("heartbeat_visible", true)
    .is("revoked_at", null);

  if (linksError) {
    console.error(
      "[care/cron/heartbeat-escalation] Caregiver-Links Abfrage fehlgeschlagen:",
      linksError,
    );
    throw new ServiceError("Caregiver-Links konnten nicht geladen werden", 500);
  }

  if (!activeLinks || activeLinks.length === 0) {
    await writeCronHeartbeat(supabase, "heartbeat_escalation", {
      processed: 0,
      skipped: "no_active_links",
    });
    return {
      processed: 0,
      reminder: 0,
      alert: 0,
      heatEscalated: 0,
      resolved: 0,
      timestamp: now.toISOString(),
    };
  }

  // Eindeutige Bewohner-IDs extrahieren
  const residentIds = [...new Set(activeLinks.map((l) => l.resident_id))];

  // Caregivers pro Bewohner (für Benachrichtigungen)
  const caregiversByResident = new Map<string, string[]>();
  for (const link of activeLinks) {
    const existing = caregiversByResident.get(link.resident_id) ?? [];
    existing.push(link.caregiver_id);
    caregiversByResident.set(link.resident_id, existing);
  }

  let reminderCount = 0;
  let alertCount = 0;
  let heatEscalatedCount = 0;
  let resolvedCount = 0;

  for (const residentId of residentIds) {
    // Letzten Heartbeat des Bewohners laden
    const { data: lastHeartbeat, error: hbError } = await supabase
      .from("heartbeats")
      .select("created_at")
      .eq("user_id", residentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (hbError) {
      console.error(
        `[care/cron/heartbeat-escalation] Heartbeat-Abfrage für ${residentId} fehlgeschlagen:`,
        hbError,
      );
      continue;
    }

    // Stunden seit letztem Heartbeat berechnen
    const hoursAgo = lastHeartbeat
      ? (now.getTime() - new Date(lastHeartbeat.created_at).getTime()) /
        (1000 * 60 * 60)
      : Infinity; // Kein Heartbeat -> sofort hoechste Stufe

    // DWD-Hitze-Check: Quartier des Bewohners ermitteln + Hitzewarnung prüfen
    let heatWarning: HeatWarningInfo | null = null;
    const baseStage = getEscalationStage(hoursAgo);
    if (baseStage === "reminder_24h") {
      // Nur im 24h-48h-Fenster lohnt sich der Hitze-Check
      const quarterId = await getUserQuarterId(supabase, residentId);
      heatWarning = await checkActiveHeatWarning(supabase, quarterId);
    }

    const stage = getHeatAwareEscalationStage(hoursAgo, heatWarning);
    const wasHeatEscalated =
      baseStage === "reminder_24h" && stage === "alert_48h";

    // === Heartbeat vorhanden und im gruenen Bereich: Offene Events auflösen ===
    if (stage === null) {
      // Offene Eskalations-Events für diesen Bewohner auflösen
      const { data: openEvents, error: openEventsError } = await supabase
        .from("escalation_events")
        .select("id, stage, notified_users")
        .eq("resident_id", residentId)
        .is("resolved_at", null);

      if (openEventsError) {
        console.error(
          `[care/cron/heartbeat-escalation] Offene Events Abfrage für ${residentId} fehlgeschlagen:`,
          openEventsError,
        );
        continue;
      }

      if (openEvents && openEvents.length > 0) {
        // Alle offenen Events auflösen
        const { error: resolveError } = await supabase
          .from("escalation_events")
          .update({ resolved_at: now.toISOString() })
          .eq("resident_id", residentId)
          .is("resolved_at", null);

        if (resolveError) {
          console.error(
            `[care/cron/heartbeat-escalation] Events auflösen für ${residentId} fehlgeschlagen:`,
            resolveError,
          );
          continue;
        }

        resolvedCount += openEvents.length;

        // Entwarnung senden, wenn mindestens ein Event auf alert_48h war
        // (reminder_24h geht nur an den Bewohner selbst, braucht keine Entwarnung an Angehoerige)
        const hadAlert = openEvents.some((e) => e.stage === "alert_48h");

        if (hadAlert) {
          // Entwarnung an alle Caregivers dieses Bewohners
          const caregiverIds = caregiversByResident.get(residentId) ?? [];
          for (const caregiverId of caregiverIds) {
            try {
              await sendCareNotification(supabase, {
                userId: caregiverId,
                type: "care_heartbeat_alert",
                title: "Entwarnung",
                body: "Ihr Angehöriger hat sich wieder gemeldet. Die Eskalation wurde aufgelöst.",
                channels: ["push", "in_app"],
              });
            } catch (notifyError) {
              console.error(
                `[care/cron/heartbeat-escalation] Entwarnung an ${caregiverId} fehlgeschlagen:`,
                notifyError,
              );
            }
          }

          // Audit-Log: Eskalation aufgelöst
          try {
            await writeAuditLog(supabase, {
              seniorId: residentId,
              actorId: "system",
              eventType: "escalation_resolved",
              metadata: {
                resolvedEvents: openEvents.length,
                trigger: "heartbeat_received",
              },
            });
          } catch (auditError) {
            console.error(
              `[care/cron/heartbeat-escalation] Audit-Log fehlgeschlagen:`,
              auditError,
            );
          }
        }
      }

      continue;
    }

    // === Eskalation nötig: Prüfen ob bereits ein offenes Event für diese Stufe existiert (Dedup) ===
    const { data: existingEvent, error: existingError } = await supabase
      .from("escalation_events")
      .select("id")
      .eq("resident_id", residentId)
      .eq("stage", stage)
      .is("resolved_at", null)
      .maybeSingle();

    if (existingError) {
      console.error(
        `[care/cron/heartbeat-escalation] Dedup-Abfrage für ${residentId}/${stage} fehlgeschlagen:`,
        existingError,
      );
      continue;
    }

    // Bereits ein offenes Event für diese Stufe -> überspringen
    if (existingEvent) {
      continue;
    }

    // Neues Eskalations-Event anlegen
    const caregiverIds = caregiversByResident.get(residentId) ?? [];

    const { data: newEvent, error: insertError } = await supabase
      .from("escalation_events")
      .insert({
        resident_id: residentId,
        stage,
        triggered_at: now.toISOString(),
        resolved_at: null,
        notified_users: caregiverIds,
      })
      .select("id")
      .single();

    if (insertError || !newEvent) {
      console.error(
        `[care/cron/heartbeat-escalation] Event erstellen für ${residentId}/${stage} fehlgeschlagen:`,
        insertError,
      );
      continue;
    }

    // Audit-Log: Eskalation ausgelöst
    try {
      await writeAuditLog(supabase, {
        seniorId: residentId,
        actorId: "system",
        eventType: "escalation_triggered",
        referenceType: "escalation_events",
        referenceId: newEvent.id,
        metadata: {
          stage,
          hoursAgo: Math.round(hoursAgo * 10) / 10,
          ...(wasHeatEscalated && {
            heatEscalated: true,
            heatHeadline: heatWarning?.headline,
          }),
        },
      });
    } catch (auditError) {
      console.error(
        `[care/cron/heartbeat-escalation] Audit-Log fehlgeschlagen:`,
        auditError,
      );
    }

    // === Benachrichtigungen nach Eskalationsstufe senden ===
    // Phase 1 Design-Doc 4.5: nur 2 Stufen, keine Lotse/Urgent-Ketten.
    switch (stage) {
      case "reminder_24h": {
        // Stufe 1: Sanfte Erinnerung an den Bewohner in der App.
        // Keine Benachrichtigung an Angehoerige — das ist bewusst.
        try {
          await sendCareNotification(supabase, {
            userId: residentId,
            type: "care_heartbeat_reminder",
            title: "Alles gut bei Ihnen?",
            body: "Wir haben seit einem Tag nichts von Ihnen gehört. Bitte melden Sie sich kurz.",
            referenceId: newEvent.id,
            referenceType: "escalation_events",
            url: "/care",
            channels: ["push", "in_app"],
          });
        } catch (notifyError) {
          console.error(
            `[care/cron/heartbeat-escalation] Reminder an ${residentId} fehlgeschlagen:`,
            notifyError,
          );
        }
        reminderCount++;
        break;
      }

      case "alert_48h": {
        // Stufe 2: Benachrichtigung an alle eingeladenen Angehoerigen (Push + SMS).
        // Bei Hitze-Eskalation: angepasster Text mit Hitze-Kontext.
        const alertTitle = wasHeatEscalated
          ? "Keine Aktivität bei Hitzewarnung"
          : "Keine Aktivität seit 48+ Stunden";
        const alertBaseBody = wasHeatEscalated
          ? "Ihr Angehöriger hat sich seit über 24 Stunden nicht gemeldet."
          : "Ihr Angehöriger hat sich seit über 48 Stunden nicht gemeldet und hat auch nicht auf die Erinnerung reagiert. Bitte prüfen Sie nach.";
        const alertBody = buildHeatAlertBody(alertBaseBody, heatWarning);

        for (const caregiverId of caregiverIds) {
          try {
            await sendCareNotification(supabase, {
              userId: caregiverId,
              type: "care_heartbeat_alert",
              title: alertTitle,
              body: alertBody,
              referenceId: newEvent.id,
              referenceType: "escalation_events",
              url: "/care/caregiver",
              channels: ["push", "sms", "in_app"],
              enableFallback: true,
            });
          } catch (notifyError) {
            console.error(
              `[care/cron/heartbeat-escalation] Alert an ${caregiverId} fehlgeschlagen:`,
              notifyError,
            );
          }
        }
        alertCount++;
        if (wasHeatEscalated) heatEscalatedCount++;
        break;
      }
    }
  }

  // Cron-Heartbeat schreiben
  await writeCronHeartbeat(supabase, "heartbeat_escalation", {
    residents: residentIds.length,
    reminder: reminderCount,
    alert: alertCount,
    heatEscalated: heatEscalatedCount,
    resolved: resolvedCount,
  });

  return {
    processed: residentIds.length,
    reminder: reminderCount,
    alert: alertCount,
    heatEscalated: heatEscalatedCount,
    resolved: resolvedCount,
    timestamp: now.toISOString(),
  };
}
