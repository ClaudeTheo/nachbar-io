import { XMLParser } from "fast-xml-parser";
import type { Database } from "@/lib/supabase/database.types";
import type {
  DwdCapAlert,
  DwdCapArea,
  DwdCapInfo,
  DwdCapValuePair,
  DwdSeverity,
  DwdWarningFeature,
  DwdWarningProperties,
} from "./types";

type CacheInsert =
  Database["public"]["Tables"]["external_warning_cache"]["Insert"];

type DwdCacheSource = DwdWarningFeature | DwdCapAlert;

const XML_OPTIONS = {
  ignoreAttributes: false,
  removeNSPrefix: true,
  isArray: (_tagName: string, jPathOrMatcher: unknown) =>
    [
      "alert.info",
      "alert.info.eventCode",
      "alert.info.parameter",
      "alert.info.area",
      "alert.info.area.geocode",
      "alert.code",
    ].includes(String(jPathOrMatcher)),
} as const;

const SEVERITY_MAP: Record<DwdSeverity, CacheInsert["severity"]> = {
  Minor: "minor",
  Moderate: "moderate",
  Severe: "severe",
  Extreme: "extreme",
  Unknown: "unknown",
};

export function parseDwdCapXml(xml: string): DwdCapAlert {
  const parser = new XMLParser(XML_OPTIONS);
  const parsed = parser.parse(xml) as { alert?: unknown };

  if (!parsed.alert || typeof parsed.alert !== "object") {
    throw new Error("Unerwartetes DWD-CAP-Format");
  }

  const alert = parsed.alert as Record<string, unknown>;
  const infos = Array.isArray(alert.info) ? alert.info : [alert.info];

  return {
    identifier: String(alert.identifier ?? ""),
    sender: stringOrUndefined(alert.sender),
    sent: stringOrUndefined(alert.sent),
    status: stringOrUndefined(alert.status),
    msgType: stringOrUndefined(alert.msgType),
    source: stringOrUndefined(alert.source),
    scope: stringOrUndefined(alert.scope),
    code: arrayOrString(alert.code),
    info: infos
      .filter((info): info is Record<string, unknown> => !!info && typeof info === "object")
      .map(mapInfo),
  };
}

export function toCacheRow(
  source: DwdCacheSource,
  ctx: {
    quarterId?: string;
    ars?: string;
    batchId: string;
    warncellId?: string;
  },
): CacheInsert {
  const normalized = normalizeDwdSource(source);
  const severity = isDwdSeverity(normalized.severity)
    ? normalized.severity
    : "Unknown";

  return {
    provider: "dwd",
    external_id: normalized.externalId,
    external_version: normalized.sentAt ?? null,
    quarter_id: ctx.quarterId ?? null,
    ars: ctx.ars ?? null,
    warncell_id: normalized.warncellId ?? ctx.warncellId ?? null,
    headline: normalized.headline ?? "DWD-Warnung",
    description: normalized.description ?? null,
    instruction: normalized.instruction ?? null,
    severity: SEVERITY_MAP[severity] ?? "unknown",
    category: normalized.category ?? null,
    event_code: normalized.eventCode ?? normalized.event ?? null,
    onset_at: normalized.onsetAt ?? null,
    expires_at: normalized.expiresAt ?? null,
    sent_at: normalized.sentAt ?? null,
    status: normalized.messageType === "cancel" ? "cancelled" : "active",
    raw_payload: source as unknown as CacheInsert["raw_payload"],
    attribution_text: "Quelle: Deutscher Wetterdienst",
    attribution_url: normalized.web ?? "https://dwd.de/warnungen",
    fetch_batch_id: ctx.batchId,
  };
}

function normalizeDwdSource(source: DwdCacheSource) {
  if ("properties" in source) {
    return normalizeFeature(source.properties);
  }

  return normalizeCapAlert(source);
}

function normalizeFeature(properties: DwdWarningProperties) {
  return {
    externalId: properties.IDENTIFIER,
    sentAt: coerceIsoString(properties.SENT),
    onsetAt: coerceIsoString(properties.ONSET ?? properties.EFFECTIVE),
    expiresAt: coerceIsoString(properties.EXPIRES),
    headline: properties.HEADLINE,
    description: properties.DESCRIPTION,
    instruction: properties.INSTRUCTION,
    category: properties.CATEGORY ?? null,
    event: properties.EVENT ?? null,
    eventCode: properties.EC_II ?? null,
    severity: properties.SEVERITY ?? "Unknown",
    messageType: normalizeMessageType(properties.MSGTYPE),
    warncellId: normalizeWarncellId(properties.WARNCELLID),
    web: properties.WEB ?? undefined,
  };
}

function normalizeCapAlert(alert: DwdCapAlert) {
  const info = alert.info[0];
  const areas = info?.area ?? [];

  return {
    externalId: alert.identifier,
    sentAt: coerceIsoString(alert.sent),
    onsetAt: coerceIsoString(info?.onset ?? info?.effective),
    expiresAt: coerceIsoString(info?.expires),
    headline: info?.headline,
    description: info?.description,
    instruction: info?.instruction,
    category: normalizeTextValue(info?.category),
    event: info?.event ?? null,
    eventCode: findCodeValue(info?.eventCode, "II"),
    severity: info?.severity ?? "Unknown",
    messageType: normalizeMessageType(alert.msgType),
    warncellId: extractWarncellId(areas),
    web: info?.web,
  };
}

function mapInfo(info: Record<string, unknown>): DwdCapInfo {
  return {
    language: stringOrUndefined(info.language),
    category: arrayOrString(info.category),
    event: stringOrUndefined(info.event),
    responseType: stringOrUndefined(info.responseType),
    urgency: stringOrUndefined(info.urgency),
    severity: stringOrUndefined(info.severity),
    certainty: stringOrUndefined(info.certainty),
    eventCode: mapValuePairs(info.eventCode),
    effective: stringOrUndefined(info.effective),
    onset: stringOrUndefined(info.onset),
    expires: stringOrUndefined(info.expires),
    senderName: stringOrUndefined(info.senderName),
    headline: stringOrUndefined(info.headline),
    description: stringOrUndefined(info.description),
    instruction: stringOrUndefined(info.instruction),
    web: stringOrUndefined(info.web),
    contact: stringOrUndefined(info.contact),
    parameter: mapValuePairs(info.parameter),
    area: mapAreas(info.area),
  };
}

function mapAreas(value: unknown): DwdCapArea[] {
  const areas = Array.isArray(value) ? value : [value];

  return areas
    .filter((area): area is Record<string, unknown> => !!area && typeof area === "object")
    .map((area) => ({
      areaDesc: stringOrUndefined(area.areaDesc),
      geocode: mapValuePairs(area.geocode),
    }));
}

function mapValuePairs(value: unknown): DwdCapValuePair[] {
  const items = Array.isArray(value) ? value : [value];

  return items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      valueName: scalarToString(item.valueName),
      value: scalarToString(item.value),
    }));
}

function extractWarncellId(areas: DwdCapArea[]): string | null {
  for (const area of areas) {
    for (const geocode of area.geocode ?? []) {
      if (geocode.valueName === "WARNCELLID" && geocode.value) {
        return geocode.value;
      }
    }
  }

  return null;
}

function normalizeWarncellId(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }

  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  return null;
}

function findCodeValue(
  values: DwdCapValuePair[] | undefined,
  key: string,
): string | null {
  return (
    values?.find((value) => value.valueName === key)?.value ?? null
  );
}

function normalizeMessageType(value: string | undefined) {
  const normalized = value?.toLowerCase() ?? "";
  return normalized === "cancel" ? "cancel" : normalized;
}

function normalizeTextValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.find(
      (entry): entry is string => typeof entry === "string" && entry.length > 0,
    ) ?? null;
  }

  return null;
}

function arrayOrString(value: unknown): string | string[] | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.filter(
      (entry): entry is string => typeof entry === "string" && entry.length > 0,
    );
  }

  return undefined;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function scalarToString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function coerceIsoString(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isDwdSeverity(value: string): value is DwdSeverity {
  return value in SEVERITY_MAP;
}
