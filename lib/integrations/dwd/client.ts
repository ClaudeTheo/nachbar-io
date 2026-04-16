import { fetchWithRetry } from "@/lib/integrations/__shared__/http";
import type { DwdFeatureCollection, DwdFetchResult } from "./types";

const DWD_WFS_BASE = "https://maps.dwd.de/geoserver/dwd/ows";

export async function fetchDwdWarnings(
  warncellId: string,
): Promise<DwdFetchResult> {
  const normalizedWarncellId = normalizeDwdWarncellId(warncellId);
  const url = buildDwdWarningsUrl(normalizedWarncellId);
  const payload = await fetchWithRetry<DwdFeatureCollection>(url);

  return {
    warncellId: normalizedWarncellId,
    fetchedAt: new Date(),
    warnings: Array.isArray(payload.features) ? payload.features : [],
  };
}

export function buildDwdWarningsUrl(warncellId: string): string {
  const normalizedWarncellId = normalizeDwdWarncellId(warncellId);
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeName: "dwd:Warnungen_Gemeinden",
    outputFormat: "application/json",
    cql_filter: `WARNCELLID=${normalizedWarncellId}`,
  });

  return `${DWD_WFS_BASE}?${params.toString()}`;
}

export function normalizeDwdWarncellId(value: string): string {
  const compact = value.replace(/\D/g, "");

  if (compact.length === 9 && compact.startsWith("8")) {
    return compact;
  }

  if (compact.length === 8) {
    return `8${compact}`;
  }

  return compact;
}
