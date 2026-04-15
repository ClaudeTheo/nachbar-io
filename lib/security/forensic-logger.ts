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
// Alternativ: Wenn direkt aus einer Node.js-Route aufgerufen wird, liegen
// Write/Cleanup-Funktionen in forensic-storage.ts, damit die Edge-Middleware
// keine Node.js-Crypto-Abhaengigkeiten in den Bundle-Graph zieht.

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
  // KEIN Fallback auf Produktions-URL — wenn NEXT_PUBLIC_SITE_URL fehlt, kein Forensik-Log
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.warn(
      "[security-forensic] NEXT_PUBLIC_SITE_URL nicht gesetzt — Forensik deaktiviert",
    );
    return;
  }
  const ingestUrl = `${siteUrl}/api/security/forensic-ingest`;

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

