// modules/care/services/cron-shopping.service.ts
// Nachbar.io — Shopping-Erinnerungs-Cron: Quartier ueber offene Einkaufsanfragen informieren (jede Stunde)

import { SupabaseClient } from "@supabase/supabase-js";
import { sendCareNotification } from "@/lib/care/notifications";
import { ServiceError } from "@/lib/services/service-error";

export interface CronShoppingResult {
  ok: true;
  urgent: number;
  notified: number;
}

// Offene Einkaufsanfragen mit Faelligkeit morgen finden und Quartier benachrichtigen
export async function runShoppingCron(
  supabase: SupabaseClient,
): Promise<CronShoppingResult> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: urgentRequests, error: requestsError } = await supabase
    .from("care_shopping_requests")
    .select("id, requester_id, items, due_date, quarter_id")
    .eq("status", "open")
    .eq("due_date", tomorrowStr);

  if (requestsError) {
    console.error(
      "[care/cron/shopping] Anfrage-Abfrage fehlgeschlagen:",
      requestsError,
    );
    throw new ServiceError(
      "Einkaufsanfragen konnten nicht geladen werden",
      500,
    );
  }

  let notified = 0;

  if (urgentRequests && urgentRequests.length > 0) {
    for (const shoppingReq of urgentRequests) {
      const { data: members } = await supabase
        .from("household_members")
        .select("user_id, households!inner(quarter_id)")
        .eq("households.quarter_id", shoppingReq.quarter_id)
        .neq("user_id", shoppingReq.requester_id);

      if (members) {
        for (const member of members.slice(0, 10)) {
          await sendCareNotification(supabase, {
            userId: member.user_id,
            type: "care_sos",
            title: "Einkaufshilfe gesucht",
            body: `Ein Nachbar braucht Hilfe beim Einkauf (${shoppingReq.items.length} Artikel, fällig morgen).`,
            referenceId: shoppingReq.id,
            referenceType: "shopping_request",
            url: "/care/shopping",
            channels: ["push", "in_app"],
          });
          notified++;
        }
      }
    }
  }

  // Heartbeat schreiben
  await supabase.from("cron_heartbeats").insert({
    job_name: "shopping_reminder",
    status: "ok",
    metadata: { urgentCount: urgentRequests?.length || 0, notified },
  });

  return {
    ok: true,
    urgent: urgentRequests?.length || 0,
    notified,
  };
}
