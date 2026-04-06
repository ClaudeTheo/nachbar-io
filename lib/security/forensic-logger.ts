// lib/security/forensic-logger.ts
// Forensik-Layer: Verschluesselte Incident-Daten fuer Strafverfolgung
// STRIKT GETRENNT vom normalen Security-Log (security-logger.ts)
//
// Rechtsgrundlage: Art. 6 Abs. 1f DSGVO (berechtigtes Interesse an IT-Sicherheit)
// Verschluesselung: AES-256-GCM (gleicher Key wie Care-Daten, CARE_ENCRYPTION_KEY)
// Retention: 7 Tage (automatische Loeschung via Cron)
// Zugriff: NUR service_role (kein User-Zugriff, auch nicht Admins direkt)
// Entschluesselung: NUR mit 4-Augen-Prinzip (2 Admins) fuer Strafanzeige
//
// ARCHITEKTUR-HINWEIS: Da die Middleware im Edge Runtime laeuft und Node.js-Crypto
// fuer die Verschluesselung braucht, delegiert logForensicData() den eigentlichen
// Write an eine interne API-Route (/api/security/forensic-ingest).
// Alternativ: Wenn direkt aus einer Node.js-Route aufgerufen (z.B. Trap-Integration),
// wird writeForensicRecord() direkt genutzt.

import type { TrapType } from "./config";

export interface ForensicData {
  eventId?: string;
  ip: string;
  userAgent: string | null;
  requestUrl: string;
  requestMethod: string;
  responseStatus?: number;
  trapType: TrapType;
}

/**
 * Schreibt forensische Daten (fire-and-forget).
 * Edge-safe: Delegiert an interne API-Route fuer Node.js-Crypto.
 */
export function logForensicData(data: ForensicData): void {
  // Fire-and-forget: Interne Route verschluesselt und speichert
  const ingestUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://nachbar-io.vercel.app"}/api/security/forensic-ingest`;

  fetch(ingestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forensic-Secret": process.env.CRON_SECRET || "",
    },
    body: JSON.stringify(data),
  }).catch((err) =>
    console.error("[security-forensic] Forensik-Ingest fehlgeschlagen:", err),
  );
}

/**
 * Direkter Write (NUR aus Node.js-Runtime aufrufen, z.B. API-Routes).
 * Verschluesselt Felder mit AES-256-GCM.
 */
export async function writeForensicRecord(data: ForensicData): Promise<void> {
  const { getAdminSupabase } = await import("@/lib/supabase/admin");
  const { encryptField } = await import("@/lib/care/field-encryption");

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

  await supabase.from("security_forensics").insert({
    event_id: data.eventId ?? null,
    ip_encrypted: ipEncrypted,
    user_agent_encrypted: uaEncrypted,
    request_url_encrypted: urlEncrypted,
    request_method: data.requestMethod,
    response_status: data.responseStatus ?? null,
    trap_type: data.trapType,
  });
}

/** Cron-Job: Abgelaufene Forensik-Daten loeschen (7 Tage Retention) */
export async function cleanupExpiredForensics(): Promise<number> {
  const { getAdminSupabase } = await import("@/lib/supabase/admin");
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
