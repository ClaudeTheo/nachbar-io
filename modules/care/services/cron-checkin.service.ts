// modules/care/services/cron-checkin.service.ts
// Nachbar.io — Check-in Scheduler Cron: Fällige Check-ins erstellen, erinnern und eskalieren (alle 5 Min)

import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/care/audit";
import { sendCareNotification } from "@/lib/care/notifications";
import { CHECKIN_DEFAULTS } from "@/lib/care/constants";
import { encryptField } from "@/lib/care/field-encryption";
import { writeCronHeartbeat } from "@/lib/care/cron-heartbeat";
import { getUserQuarterId } from "@/lib/quarters/helpers";
import { ServiceError } from "@/lib/services/service-error";

export interface CronCheckinResult {
  created: number;
  reminded: number;
  escalated: number;
  timestamp: string;
}

// Alle Care-Profile laden und Check-in-Phasen durchlaufen
export async function runCheckinCron(
  supabase: SupabaseClient,
): Promise<CronCheckinResult> {
  // Alle Care-Profile laden, für die Check-ins aktiviert sind
  const { data: profiles, error: profilesError } = await supabase
    .from("care_profiles")
    .select("user_id, checkin_times")
    .eq("checkin_enabled", true);

  if (profilesError) {
    console.error(
      "[care/cron/checkin] Profile-Abfrage fehlgeschlagen:",
      profilesError,
    );
    throw new ServiceError("Profile konnten nicht geladen werden", 500);
  }

  const allProfiles = profiles ?? [];
  const now = new Date();

  let createdCount = 0;
  let remindedCount = 0;
  let escalatedCount = 0;

  for (const profile of allProfiles) {
    const checkinTimes: string[] = Array.isArray(profile.checkin_times)
      ? profile.checkin_times
      : [...CHECKIN_DEFAULTS.defaultTimes];

    for (const timeStr of checkinTimes) {
      // Geplanten Check-in-Zeitpunkt für heute berechnen (HH:MM -> Date)
      const [hours, minutes] = timeStr.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) continue;

      const scheduledAt = new Date(now);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const elapsedMinutes =
        (now.getTime() - scheduledAt.getTime()) / (1000 * 60);

      // === Phase 1: Check-in erstellen (0-5 Min nach Fälligkeitszeit) ===
      if (elapsedMinutes >= 0 && elapsedMinutes < 5) {
        const result = await handlePhaseCreate(
          supabase,
          profile.user_id,
          scheduledAt,
          timeStr,
        );
        if (result) createdCount++;
        continue;
      }

      // === Phase 2: Erinnerung senden (30-35 Min nach Fälligkeitszeit) ===
      if (
        elapsedMinutes >= CHECKIN_DEFAULTS.reminderAfterMinutes &&
        elapsedMinutes < CHECKIN_DEFAULTS.reminderAfterMinutes + 5
      ) {
        const result = await handlePhaseReminder(
          supabase,
          profile.user_id,
          scheduledAt,
          timeStr,
          now,
        );
        if (result) remindedCount++;
        continue;
      }

      // === Phase 3: Eskalation (60-65 Min nach Fälligkeitszeit) ===
      if (
        elapsedMinutes >= CHECKIN_DEFAULTS.escalateAfterMinutes &&
        elapsedMinutes < CHECKIN_DEFAULTS.escalateAfterMinutes + 5
      ) {
        const result = await handlePhaseEscalation(
          supabase,
          profile.user_id,
          scheduledAt,
          timeStr,
        );
        if (result) escalatedCount++;
      }
    }
  }

  // Heartbeat schreiben (FMEA FM-CI-01)
  await writeCronHeartbeat(supabase, "checkin", {
    created: createdCount,
    reminded: remindedCount,
    escalated: escalatedCount,
  });

  return {
    created: createdCount,
    reminded: remindedCount,
    escalated: escalatedCount,
    timestamp: now.toISOString(),
  };
}

// Phase 1: Check-in erstellen (0-5 Min nach Fälligkeitszeit)
async function handlePhaseCreate(
  supabase: SupabaseClient,
  userId: string,
  scheduledAt: Date,
  timeStr: string,
): Promise<boolean> {
  // Prüfen ob für diesen Zeitpunkt bereits ein Check-in existiert
  const { data: existing, error: existingError } = await supabase
    .from("care_checkins")
    .select("id")
    .eq("senior_id", userId)
    .eq("scheduled_at", scheduledAt.toISOString())
    .maybeSingle();

  if (existingError) {
    console.error(
      `[care/cron/checkin] Existenz-Prüfung für Senior ${userId} fehlgeschlagen:`,
      existingError,
    );
    return false;
  }

  if (existing) return false;

  // Neuen ausstehenden Check-in anlegen
  const { data: newCheckin, error: insertError } = await supabase
    .from("care_checkins")
    .insert({
      senior_id: userId,
      status: "reminded",
      mood: null,
      note: null,
      scheduled_at: scheduledAt.toISOString(),
      completed_at: null,
      reminder_sent_at: null,
      escalated: false,
    })
    .select("id")
    .single();

  if (insertError || !newCheckin) {
    console.error(
      `[care/cron/checkin] Check-in für Senior ${userId} konnte nicht erstellt werden:`,
      insertError,
    );
    return false;
  }

  // Erste Push-Erinnerung an den Senior senden
  try {
    await sendCareNotification(supabase, {
      userId,
      type: "care_checkin_reminder",
      title: "Zeit für Ihren Check-in",
      body: `Bitte melden Sie sich: Wie geht es Ihnen? (Geplant: ${timeStr} Uhr)`,
      referenceId: newCheckin.id,
      referenceType: "care_checkins",
      url: "/care/checkin",
      channels: ["push", "in_app"],
    });
  } catch (notifyError) {
    console.error(
      `[care/cron/checkin] Erste Erinnerung für Senior ${userId} fehlgeschlagen:`,
      notifyError,
    );
  }

  return true;
}

// Phase 2: Erinnerung senden (30-35 Min nach Fälligkeitszeit)
async function handlePhaseReminder(
  supabase: SupabaseClient,
  userId: string,
  scheduledAt: Date,
  timeStr: string,
  now: Date,
): Promise<boolean> {
  // Offenen Check-in suchen (noch nicht abgeschlossen, noch keine zweite Erinnerung)
  const { data: pendingCheckin, error: pendingError } = await supabase
    .from("care_checkins")
    .select("id, reminder_sent_at, completed_at")
    .eq("senior_id", userId)
    .eq("scheduled_at", scheduledAt.toISOString())
    .is("completed_at", null)
    .is("reminder_sent_at", null)
    .maybeSingle();

  if (pendingError) {
    console.error(
      `[care/cron/checkin] Erinnerungs-Abfrage für Senior ${userId} fehlgeschlagen:`,
      pendingError,
    );
    return false;
  }

  if (!pendingCheckin) return false;

  // reminder_sent_at setzen um doppelte Erinnerungen zu verhindern
  const { error: updateError } = await supabase
    .from("care_checkins")
    .update({ reminder_sent_at: now.toISOString() })
    .eq("id", pendingCheckin.id);

  if (updateError) {
    console.error(
      `[care/cron/checkin] reminder_sent_at Update für Check-in ${pendingCheckin.id} fehlgeschlagen:`,
      updateError,
    );
    return false;
  }

  // Zweite Push-Erinnerung an den Senior senden
  try {
    await sendCareNotification(supabase, {
      userId,
      type: "care_checkin_reminder",
      title: "Erinnerung: Bitte melden Sie sich",
      body: `Sie haben sich noch nicht eingecheckt. Ihr letzter geplanter Check-in war um ${timeStr} Uhr.`,
      referenceId: pendingCheckin.id,
      referenceType: "care_checkins",
      url: "/care/checkin",
      channels: ["push", "in_app"],
    });
  } catch (notifyError) {
    console.error(
      `[care/cron/checkin] Zweite Erinnerung für Senior ${userId} fehlgeschlagen:`,
      notifyError,
    );
  }

  return true;
}

// Phase 3: Eskalation (60-65 Min nach Fälligkeitszeit)
async function handlePhaseEscalation(
  supabase: SupabaseClient,
  userId: string,
  scheduledAt: Date,
  timeStr: string,
): Promise<boolean> {
  // Offenen, nicht-eskalierten Check-in suchen
  const { data: overdueCheckin, error: overdueError } = await supabase
    .from("care_checkins")
    .select("id, completed_at, escalated")
    .eq("senior_id", userId)
    .eq("scheduled_at", scheduledAt.toISOString())
    .is("completed_at", null)
    .eq("escalated", false)
    .maybeSingle();

  if (overdueError) {
    console.error(
      `[care/cron/checkin] Eskalations-Abfrage für Senior ${userId} fehlgeschlagen:`,
      overdueError,
    );
    return false;
  }

  if (!overdueCheckin) return false;

  // Check-in als verpasst und eskaliert markieren
  const { error: updateError } = await supabase
    .from("care_checkins")
    .update({ status: "missed", escalated: true })
    .eq("id", overdueCheckin.id);

  if (updateError) {
    console.error(
      `[care/cron/checkin] Eskalations-Update für Check-in ${overdueCheckin.id} fehlgeschlagen:`,
      updateError,
    );
    return false;
  }

  // Audit-Log: Check-in verpasst
  try {
    await writeAuditLog(supabase, {
      seniorId: userId,
      actorId: "system",
      eventType: "checkin_missed",
      referenceType: "care_checkins",
      referenceId: overdueCheckin.id,
      metadata: {
        scheduledAt: scheduledAt.toISOString(),
        scheduledTime: timeStr,
      },
    });
  } catch (auditError) {
    console.error(
      `[care/cron/checkin] Audit-Log (checkin_missed) fehlgeschlagen:`,
      auditError,
    );
  }

  // Auto-SOS-Alert anlegen: Quelle 'checkin_timeout'
  let sosAlertId: string | null = null;
  try {
    const quarterId = await getUserQuarterId(supabase, userId);
    const { data: sosAlert, error: sosError } = await supabase
      .from("care_sos_alerts")
      .insert({
        senior_id: userId,
        category: "general_help",
        status: "triggered",
        current_escalation_level: 1,
        escalated_at: [],
        notes: encryptField(
          `Automatischer SOS-Alert: Check-in um ${timeStr} Uhr wurde nicht bestätigt.`,
        ),
        source: "checkin_timeout",
        quarter_id: quarterId,
      })
      .select("id")
      .single();

    if (sosError || !sosAlert) {
      console.error(
        `[care/cron/checkin] Auto-SOS für Senior ${userId} konnte nicht erstellt werden:`,
        sosError,
      );
    } else {
      sosAlertId = sosAlert.id;
    }
  } catch (sosCreateError) {
    console.error(
      `[care/cron/checkin] Auto-SOS Erstellung fehlgeschlagen:`,
      sosCreateError,
    );
  }

  // Audit-Log: Check-in eskaliert (SOS ausgelöst)
  try {
    await writeAuditLog(supabase, {
      seniorId: userId,
      actorId: "system",
      eventType: "checkin_escalated",
      referenceType: "care_checkins",
      referenceId: overdueCheckin.id,
      metadata: {
        scheduledAt: scheduledAt.toISOString(),
        scheduledTime: timeStr,
        sosAlertId,
        automatic: true,
      },
    });
  } catch (auditError) {
    console.error(
      `[care/cron/checkin] Audit-Log (checkin_escalated) fehlgeschlagen:`,
      auditError,
    );
  }

  // Angehörige und Pflegedienst-Helfer benachrichtigen
  try {
    const { data: helpers, error: helpersError } = await supabase
      .from("care_helpers")
      .select("user_id, role")
      .in("role", ["relative", "care_service"])
      .eq("verification_status", "verified")
      .contains("assigned_seniors", [userId]);

    if (helpersError) {
      console.error(
        `[care/cron/checkin] Helfer-Abfrage für Senior ${userId} fehlgeschlagen:`,
        helpersError,
      );
    } else if (helpers && helpers.length > 0) {
      const notifyPromises = helpers.map((helper) =>
        sendCareNotification(supabase, {
          userId: helper.user_id,
          type: "care_checkin_missed",
          title: "Check-in verpasst",
          body: "Ihr Angehöriger hat den Check-in seit über 60 Minuten nicht bestätigt.",
          referenceId: sosAlertId ?? overdueCheckin.id,
          referenceType: sosAlertId ? "care_sos_alerts" : "care_checkins",
          url: sosAlertId ? `/care/sos/${sosAlertId}` : "/care/checkin",
          channels: ["push", "sms", "in_app"],
          enableFallback: true,
        }),
      );

      await Promise.all(notifyPromises);
    }
  } catch (notifyError) {
    console.error(
      `[care/cron/checkin] Helfer-Benachrichtigung für Senior ${userId} fehlgeschlagen:`,
      notifyError,
    );
  }

  return true;
}
