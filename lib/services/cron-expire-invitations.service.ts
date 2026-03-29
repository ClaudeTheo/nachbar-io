// Nachbar.io — Expire-Invitations-Cron-Service
// Business-Logik fuer das automatische Ablaufen offener Einladungen nach 30 Tagen.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";

export interface ExpireInvitationsCronResult {
  success: boolean;
  expired: number;
  timestamp: string;
}

/**
 * Setzt alle offenen Einladungen aelter als 30 Tage auf 'expired'.
 */
export async function runExpireInvitationsCron(
  supabase: SupabaseClient,
): Promise<ExpireInvitationsCronResult> {
  // Alle offenen Einladungen aelter als 30 Tage auf 'expired' setzen
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from("neighbor_invitations")
    .update({ status: "expired" })
    .eq("status", "sent")
    .lt("created_at", thirtyDaysAgo.toISOString())
    .select("id");

  if (error) {
    console.error("Einladungs-Ablauf fehlgeschlagen:", error);
    throw new ServiceError("Datenbankfehler beim Ablauf der Einladungen", 500);
  }

  const expiredCount = data?.length ?? 0;

  console.log(`Einladungs-Ablauf: ${expiredCount} Einladung(en) abgelaufen`);

  return {
    success: true,
    expired: expiredCount,
    timestamp: new Date().toISOString(),
  };
}
