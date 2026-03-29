// Nachbar.io — Dormancy-Cron-Service
// Business-Logik fuer die Dormancy-Detection: inaktive Quartiere erkennen
// und Re-Engagement-Pushes an Mitglieder senden.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { sendPush } from "@/lib/care/channels/push";
import { writeCronHeartbeat } from "@/lib/care/cron-heartbeat";
import { safeInsertNotification } from "@/lib/notifications-server";

export interface DormancyCronResult {
  success: boolean;
  quartersProcessed: number;
  pushesSent: number;
  timestamp: string;
}

/**
 * Prueft alle aktiven Quartiere auf Inaktivitaet und sendet Re-Engagement-Pushes
 * wenn weniger als 10% der Mitglieder in den letzten 7 Tagen aktiv waren.
 */
export async function runDormancyCron(
  supabase: SupabaseClient
): Promise<DormancyCronResult> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  let quartersProcessed = 0;
  let pushesSent = 0;

  // Alle aktiven Quartiere laden
  const { data: quarters, error: qError } = await supabase
    .from("quarters")
    .select("id, name, status, weekly_active_pct, household_count")
    .in("status", ["active", "thriving", "activating"]);

  if (qError) {
    console.error("[dormancy] Quartier-Query fehlgeschlagen:", qError);
    throw new ServiceError("DB-Fehler", 500);
  }

  for (const quarter of quarters ?? []) {
    // Mitglieder des Quartiers holen
    const { data: quarterMembers } = await supabase
      .from("household_members")
      .select("user_id")
      .eq("quarter_id", quarter.id);

    const quarterUserIds = (quarterMembers ?? []).map(
      (m: { user_id: string }) => m.user_id
    );
    const total = quarterUserIds.length;
    if (total === 0) continue;

    // Aktive User der letzten 7 Tage zaehlen (Quartier-bezogen)
    let activeInQuarter = 0;
    if (quarterUserIds.length > 0) {
      const { count } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .in("id", quarterUserIds)
        .gt("last_seen", sevenDaysAgo.toISOString());
      activeInQuarter = count ?? 0;
    }

    const pct = Math.round((activeInQuarter / total) * 100);

    // weekly_active_pct aktualisieren
    await supabase
      .from("quarters")
      .update({ weekly_active_pct: pct })
      .eq("id", quarter.id);

    quartersProcessed++;

    // Wenn < 10% aktiv: Re-Engagement-Push an alle Mitglieder
    if (pct < 10 && quarterUserIds.length > 0) {
      for (const userId of quarterUserIds) {
        await sendPush(supabase, {
          userId,
          title: "Ihre Nachbarschaft vermisst Sie!",
          body: `Im Quartier ${quarter.name} ist es ruhig geworden. Schauen Sie mal vorbei!`,
          url: "/dashboard",
        });

        await safeInsertNotification(supabase, {
          user_id: userId,
          type: "broadcast",
          title: "Ihre Nachbarschaft vermisst Sie!",
          body: `Im Quartier ${quarter.name} ist es ruhig geworden. Schauen Sie mal vorbei!`,
        });

        pushesSent++;
      }
    }
  }

  await writeCronHeartbeat(supabase, "dormancy", {
    quartersProcessed,
    pushesSent,
  });

  console.log(
    `[dormancy] ${quartersProcessed} Quartiere geprueft, ${pushesSent} Pushes`
  );

  return {
    success: true,
    quartersProcessed,
    pushesSent,
    timestamp: now.toISOString(),
  };
}
