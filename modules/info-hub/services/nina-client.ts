// NINA-Warnungen vom Bundesamt fuer Bevoelkerungsschutz (BBK)
// API: https://warnung.bund.de/api31/

import type { NinaWarning, NinaSeverity } from "../types";

// AGS Landkreis Waldshut (Bad Saeckingen)
const DEFAULT_AGS = "083370000000";

// Severity-Mapping: NINA nutzt verschiedene Formate
function mapSeverity(raw: string | undefined): NinaSeverity {
  const s = (raw || "").toLowerCase();
  if (s === "extreme") return "Extreme";
  if (s === "severe") return "Severe";
  if (s === "moderate") return "Moderate";
  return "Minor";
}

/**
 * Holt aktuelle NINA-Warnungen fuer einen AGS-Code
 * @param ags Amtlicher Gemeindeschluessel (Default: Landkreis Waldshut)
 */
export async function fetchNinaWarnings(
  ags: string = DEFAULT_AGS,
): Promise<NinaWarning[]> {
  try {
    const url = `https://warnung.bund.de/api31/dashboard/${ags}.json`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error("[nina] API Fehler:", res.status, res.statusText);
      return [];
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      console.warn("[nina] Unerwartetes Response-Format");
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((item: any) => ({
      id: String(item.id || ""),
      warning_id: String(item.id || ""),
      severity: mapSeverity(item.severity as string),
      headline: String(item.i18nTitle?.de || item.headline || "Warnung"),
      description:
        (item.i18nDescription?.de as string) ||
        (item.description as string) ||
        null,
      sent_at: String(item.sent || new Date().toISOString()),
      expires_at: (item.expires as string) || null,
    })) as NinaWarning[];
  } catch (err) {
    // Fehlerfall: Leeres Array (keine Warnung = besser als Crash)
    console.error("[nina] Netzwerkfehler:", err);
    return [];
  }
}
