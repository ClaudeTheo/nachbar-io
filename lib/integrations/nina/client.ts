import { fetchWithRetry } from "@/lib/integrations/__shared__/http";
import type { NinaDashboardItem, NinaFetchResult } from "./types";

const NINA_BASE = "https://warnung.bund.de/api31";

export async function fetchNinaWarnings(ars: string): Promise<NinaFetchResult> {
  const normalizedArs = normalizeNinaDashboardArs(ars);
  const url = `${NINA_BASE}/dashboard/${encodeURIComponent(normalizedArs)}.json`;
  const payload = await fetchWithRetry<unknown>(url);

  if (!Array.isArray(payload)) {
    throw new Error(`Unerwartete NINA-Antwort fuer ${ars}`);
  }

  return {
    ars,
    fetchedAt: new Date(),
    warnings: payload as NinaDashboardItem[],
  };
}

export function normalizeNinaDashboardArs(ars: string): string {
  const compact = ars.replace(/\D/g, "");

  if (compact.length === 12) {
    return compact;
  }

  // BBK-Dashboard liefert Kreisdaten. Aus dem im Quartier gespeicherten
  // 8-stelligen AGS wird deshalb der 12-stellige Kreisschluessel abgeleitet.
  if (compact.length === 8) {
    return `${compact.slice(0, 5)}0000000`;
  }

  if (compact.length === 5) {
    return `${compact}0000000`;
  }

  return compact;
}
