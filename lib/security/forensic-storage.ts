import "server-only";

import { encryptField } from "@/lib/care/field-encryption";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { ForensicData } from "./forensic-logger";

/**
 * Direkter Write (NUR aus Node.js-Runtime aufrufen, z.B. API-Routes).
 * Verschluesselt Felder mit AES-256-GCM.
 */
export async function writeForensicRecord(data: ForensicData): Promise<void> {
  const supabase = getAdminSupabase();

  const ipEncrypted = encryptField(data.ip);
  const uaEncrypted = data.userAgent ? encryptField(data.userAgent) : null;
  const urlEncrypted = encryptField(data.requestUrl);

  if (!ipEncrypted) {
    console.warn(
      "[security-forensic] IP-Verschluesselung fehlgeschlagen — CARE_ENCRYPTION_KEY fehlt?",
    );
    return;
  }

  const { error } = await supabase.from("security_forensics").insert({
    event_id: data.eventId ?? null,
    ip_encrypted: ipEncrypted,
    user_agent_encrypted: uaEncrypted,
    request_url_encrypted: urlEncrypted,
    request_method: data.requestMethod,
    response_status: data.responseStatus ?? null,
    trap_type: data.trapType,
  });

  if (error) {
    throw new Error(`Forensik-Insert fehlgeschlagen: ${error.message}`);
  }
}

/** Cron-Job: Abgelaufene Forensik-Daten loeschen (7 Tage Retention) */
export async function cleanupExpiredForensics(): Promise<number> {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from("security_forensics")
    .delete()
    .lte("expires_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("[security-forensic] Cleanup fehlgeschlagen:", error);
    return 0;
  }

  const count = data?.length ?? 0;
  if (count > 0) {
    console.info(
      `[security-forensic] ${count} abgelaufene Forensik-Records geloescht`,
    );
  }
  return count;
}
