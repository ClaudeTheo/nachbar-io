// modules/care/services/cron-tasks.service.ts
// Nachbar.io — Tasks-Erinnerungs-Cron: Dringende offene Aufgaben eskalieren (alle 2 Stunden)

import { SupabaseClient } from "@supabase/supabase-js";
import { sendCareNotification } from "@/lib/care/notifications";
import { ServiceError } from "@/lib/services/service-error";

export interface CronTasksResult {
  ok: true;
  urgent: number;
  notified: number;
}

// Dringende offene Aufgaben aelter als 4h finden und Quartier benachrichtigen
export async function runTasksCron(
  supabase: SupabaseClient,
): Promise<CronTasksResult> {
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

  const { data: urgentTasks, error: tasksError } = await supabase
    .from("care_tasks")
    .select("id, creator_id, title, quarter_id")
    .eq("status", "open")
    .eq("urgency", "urgent")
    .lt("created_at", fourHoursAgo);

  if (tasksError) {
    console.error(
      "[care/cron/tasks] Aufgaben-Abfrage fehlgeschlagen:",
      tasksError,
    );
    throw new ServiceError("Aufgaben konnten nicht geladen werden", 500);
  }

  let notified = 0;

  if (urgentTasks && urgentTasks.length > 0) {
    for (const task of urgentTasks) {
      const { data: members } = await supabase
        .from("household_members")
        .select("user_id, households!inner(quarter_id)")
        .eq("households.quarter_id", task.quarter_id)
        .neq("user_id", task.creator_id);

      if (members) {
        for (const member of members.slice(0, 10)) {
          await sendCareNotification(supabase, {
            userId: member.user_id,
            type: "care_sos",
            title: "Dringende Hilfe gesucht",
            body: `"${task.title}" — Ein Nachbar braucht dringend Hilfe!`,
            referenceId: task.id,
            referenceType: "care_task",
            url: "/care/tasks",
            channels: ["push", "in_app"],
          });
          notified++;
        }
      }
    }
  }

  // Heartbeat schreiben
  await supabase.from("cron_heartbeats").insert({
    job_name: "task_reminder",
    status: "ok",
    metadata: { urgentCount: urgentTasks?.length || 0, notified },
  });

  return {
    ok: true,
    urgent: urgentTasks?.length || 0,
    notified,
  };
}
