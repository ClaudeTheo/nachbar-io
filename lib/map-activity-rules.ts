import type {
  MapActivityPinColorState,
  MapActivityPinLocationScope,
  MapActivityPinType,
  MapActivityPinUrgency,
} from "@/lib/map-activity-pins";

export interface ResolveMapActivityPinRuleInput {
  category?: string | null;
  title?: string | null;
  urgency?: string | null;
  locationScope?: MapActivityPinLocationScope;
  fallbackType?: MapActivityPinType;
  isEmergency?: boolean | null;
}

export interface ResolvedMapActivityPinRule {
  type: MapActivityPinType;
  urgency: MapActivityPinUrgency;
  colorState: MapActivityPinColorState;
  locationScope: MapActivityPinLocationScope;
}

const EMERGENCY_CATEGORIES = new Set([
  "accident",
  "crime",
  "emergency",
  "fall",
  "fire",
  "health_concern",
  "medical",
  "notfall",
  "unfall",
]);

const STATUS_CATEGORIES = new Set([
  "absence",
  "abwesenheit",
  "holiday",
  "status",
  "urlaub",
  "vacation",
]);

const URGENT_VALUES = new Set(["high", "important", "urgent", "dringend"]);
const EMERGENCY_VALUES = new Set(["acute", "emergency", "notfall", "sofort"]);
const STATUS_VALUES = new Set(["status", "away", "absence", "vacation"]);

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function containsAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function resolveType(
  category: string,
  title: string,
  fallbackType?: MapActivityPinType,
): MapActivityPinType {
  const combined = `${category} ${title}`.trim();

  if (containsAny(combined, ["lern", "learning", "hausaufgabe", "study"])) {
    return "learning";
  }

  if (containsAny(combined, ["treff", "meeting", "gruppe", "jugend"])) {
    return "meeting";
  }

  if (containsAny(combined, ["sport", "spiel", "fussball", "kick", "game"])) {
    return "sport";
  }

  if (containsAny(combined, ["rasen", "maeh", "mah", "mow", "lawn"])) {
    return "mowing";
  }

  if (containsAny(combined, ["garten", "pflanz", "beet", "garden", "plant"])) {
    return "gardening";
  }

  if (containsAny(combined, ["einkauf", "shopping", "besorgung"])) {
    return "shopping";
  }

  if (
    containsAny(combined, ["handy", "technik", "digital", "wlan", "phone", "tech"])
  ) {
    return "tech";
  }

  if (
    containsAny(combined, ["begleit", "companion", "abholen", "weg", "escort"])
  ) {
    return "companion";
  }

  if (containsAny(combined, ["event", "veranstaltung", "termin"])) {
    return "event";
  }

  if (fallbackType) {
    return fallbackType;
  }

  return "meeting";
}

function resolveUrgency(
  category: string,
  urgency: string,
  isEmergency: boolean | null | undefined,
): MapActivityPinUrgency {
  if (
    isEmergency ||
    EMERGENCY_CATEGORIES.has(category) ||
    EMERGENCY_VALUES.has(urgency)
  ) {
    return "emergency";
  }

  if (STATUS_CATEGORIES.has(category) || STATUS_VALUES.has(urgency)) {
    return "status";
  }

  if (URGENT_VALUES.has(urgency)) {
    return "urgent";
  }

  return "normal";
}

function resolveDefaultLocationScope(
  type: MapActivityPinType,
  urgency: MapActivityPinUrgency,
): MapActivityPinLocationScope {
  if (urgency === "emergency") {
    return "quarter_area";
  }

  if (urgency === "status") {
    return "home";
  }

  switch (type) {
    case "learning":
    case "meeting":
    case "sport":
    case "event":
      return "meeting_point";
    case "mowing":
    case "shopping":
    case "tech":
    case "gardening":
    case "companion":
    case "warning":
      return "home";
  }
}

function resolveColorState(
  urgency: MapActivityPinUrgency,
): MapActivityPinColorState {
  switch (urgency) {
    case "emergency":
      return "red";
    case "urgent":
      return "yellow";
    case "status":
      return "blue";
    case "normal":
      return "green";
  }
}

export function resolveMapActivityPinRule({
  category: rawCategory,
  title: rawTitle,
  urgency: rawUrgency,
  locationScope,
  fallbackType,
  isEmergency,
}: ResolveMapActivityPinRuleInput): ResolvedMapActivityPinRule {
  const category = normalizeText(rawCategory);
  const title = normalizeText(rawTitle);
  const normalizedUrgency = normalizeText(rawUrgency);
  const resolvedUrgency = resolveUrgency(
    category,
    normalizedUrgency,
    isEmergency,
  );
  const type =
    resolvedUrgency === "emergency"
      ? "warning"
      : resolvedUrgency === "status"
        ? (fallbackType ?? "companion")
        : resolveType(category, title, fallbackType);

  return {
    type,
    urgency: resolvedUrgency,
    colorState: resolveColorState(resolvedUrgency),
    locationScope: locationScope ?? resolveDefaultLocationScope(type, resolvedUrgency),
  };
}
