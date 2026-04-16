import type { Database } from "@/lib/supabase/database.types";
import type { NinaDashboardItem, NinaPayloadData, NinaSeverity } from "./types";

type CacheInsert =
  Database["public"]["Tables"]["external_warning_cache"]["Insert"];

const SEVERITY_MAP: Record<
  NinaSeverity,
  CacheInsert["severity"]
> = {
  Minor: "minor",
  Moderate: "moderate",
  Severe: "severe",
  Extreme: "extreme",
  Unknown: "unknown",
};

export function toCacheRow(
  item: NinaDashboardItem,
  ctx: { quarterId?: string; ars: string; batchId: string },
): CacheInsert {
  const data = item.payload?.data ?? {};
  const headline = resolveHeadline(item, data);
  const severity = resolveSeverity(item, data);
  const messageType = resolveMessageType(item, data);
  const sentAt = coerceIsoString(item.sent) ?? coerceIsoString(item.version);

  return {
    provider: "nina",
    external_id: item.id,
    external_version: resolveVersion(item),
    quarter_id: ctx.quarterId ?? null,
    ars: ctx.ars,
    warncell_id: null,
    headline,
    description: data.description ?? null,
    instruction: data.instruction ?? null,
    severity: SEVERITY_MAP[severity] ?? "unknown",
    category: normalizeTextValue(data.category),
    event_code: resolveEventCode(data),
    onset_at: coerceIsoString(item.startDate) ?? sentAt,
    expires_at: coerceIsoString(item.expiresDate) ?? coerceIsoString(item.expires),
    sent_at: sentAt,
    status: messageType === "cancel" ? "cancelled" : "active",
    raw_payload: item as unknown as CacheInsert["raw_payload"],
    attribution_text:
      "Quelle: Bundesamt fuer Bevoelkerungsschutz und Katastrophenhilfe (BBK)",
    attribution_url: `https://warnung.bund.de/meldung/${encodeURIComponent(item.id)}`,
    fetch_batch_id: ctx.batchId,
  };
}

function resolveHeadline(item: NinaDashboardItem, data: NinaPayloadData): string {
  return (
    data.headline ??
    item.i18nTitle?.DE ??
    item.i18nTitle?.de ??
    "Warnung"
  );
}

function resolveSeverity(
  item: NinaDashboardItem,
  data: NinaPayloadData,
): NinaSeverity {
  const value = data.severity ?? item.severity ?? "Unknown";
  return isNinaSeverity(value) ? value : "Unknown";
}

function resolveMessageType(
  item: NinaDashboardItem,
  data: NinaPayloadData,
): "alert" | "update" | "cancel" | "unknown" {
  const raw = data.msgType ?? item.type ?? item.payload?.type ?? "";
  const normalized = raw.toLowerCase();

  if (normalized === "alert") return "alert";
  if (normalized === "update") return "update";
  if (normalized === "cancel") return "cancel";
  return "unknown";
}

function resolveEventCode(data: NinaPayloadData): string | null {
  if (typeof data.event === "string" && data.event.length > 0) {
    return data.event;
  }

  const transKeysEvent = data.transKeys?.event;
  return typeof transKeysEvent === "string" && transKeysEvent.length > 0
    ? transKeysEvent
    : null;
}

function resolveVersion(item: NinaDashboardItem): string | null {
  if (typeof item.version === "string" && item.version.length > 0) {
    return item.version;
  }

  if (typeof item.sent === "string" && item.sent.length > 0) {
    return item.sent;
  }

  if (
    typeof item.payload?.version === "number" ||
    typeof item.payload?.version === "string"
  ) {
    return String(item.payload.version);
  }

  return null;
}

function normalizeTextValue(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value.find(
      (entry): entry is string => typeof entry === "string" && entry.length > 0,
    ) ?? null;
  }

  return null;
}

function coerceIsoString(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isNinaSeverity(value: string): value is NinaSeverity {
  return value in SEVERITY_MAP;
}
