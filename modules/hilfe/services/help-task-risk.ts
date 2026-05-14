import type { HelpCategory } from "@/modules/hilfe/services/types";
import type { HelpRecognitionType } from "@/modules/hilfe/services/compensation";

export type HelpTaskRisk = "low" | "medium" | "blocked_for_minors";

interface HelpTaskRiskInput {
  category: string | null | undefined;
  subcategory?: string | null;
}

interface HelpTaskRiskDecision {
  risk: HelpTaskRisk;
  minorEligible: boolean;
  warning: string | null;
}

interface MinorHelpDecisionInput extends HelpTaskRiskInput {
  age: number;
  hasGuardianConsent: boolean;
  recognitionType: HelpRecognitionType;
  estimatedDurationMinutes?: number | null;
}

interface MinorHelpDecision {
  allowed: boolean;
  reason: string;
}

const LOW_RISK_TASKS = new Set<string>([
  "shopping:*",
  "shopping:errand",
  "tech:*",
  "tech:phone_help",
  "company:walk",
  "garden:watering",
  "tutoring:basic",
  "package:receive",
]);

const MEDIUM_RISK_TASKS = new Set<string>([
  "garden:mowing",
  "garden:simple_help",
  "pet_care:dog_walking",
  "handwork:assembly",
  "moving:light",
]);

const BLOCKED_FOR_MINORS = new Set<string>([
  "handwork:electrical",
  "handwork:plumbing",
  "handwork:carpentry",
  "garden:hedge_trimming",
  "garden:chainsaw",
  "garden:ladder",
  "transport:*",
  "medication:*",
  "care:*",
  "childcare:*",
  "money_handling:*",
  "legal:*",
  "tax:*",
  "medical:*",
]);

export function classifyHelpTaskRisk(input: HelpTaskRiskInput): HelpTaskRiskDecision {
  const category = normalizeKey(input.category);
  const subcategory = normalizeKey(input.subcategory);
  const specificKey = `${category}:${subcategory}`;
  const wildcardKey = `${category}:*`;

  if (BLOCKED_FOR_MINORS.has(specificKey) || BLOCKED_FOR_MINORS.has(wildcardKey)) {
    return {
      risk: "blocked_for_minors",
      minorEligible: false,
      warning: "Diese Aufgabe ist nicht für Minderjährige geeignet.",
    };
  }

  if (MEDIUM_RISK_TASKS.has(specificKey) || MEDIUM_RISK_TASKS.has(wildcardKey)) {
    return {
      risk: "medium",
      minorEligible: false,
      warning: "Diese Aufgabe sollte nur von Erwachsenen übernommen werden.",
    };
  }

  if (LOW_RISK_TASKS.has(specificKey) || LOW_RISK_TASKS.has(wildcardKey)) {
    return {
      risk: "low",
      minorEligible: true,
      warning: null,
    };
  }

  return {
    risk: "medium",
    minorEligible: false,
    warning: "Diese Aufgabe muss vor einer Jugendfreigabe geprüft werden.",
  };
}

export function getMinorHelpDecision(input: MinorHelpDecisionInput): MinorHelpDecision {
  if (input.age < 13) {
    return {
      allowed: false,
      reason: "Für Jugendliche unter 13 Jahren ist keine Aufgabenannahme möglich.",
    };
  }

  if (input.age < 18 && !input.hasGuardianConsent) {
    return {
      allowed: false,
      reason: "Für diese Aufgabe ist eine Elternfreigabe erforderlich.",
    };
  }

  if (input.age < 18 && input.recognitionType !== "free") {
    return {
      allowed: false,
      reason: "Jugendliche sehen nur kostenlose Aufgaben ohne Geldhandling.",
    };
  }

  if (input.age < 18 && (input.estimatedDurationMinutes ?? 0) > 120) {
    return {
      allowed: false,
      reason: "Diese Aufgabe ist für Jugendliche zu lang.",
    };
  }

  const risk = classifyHelpTaskRisk(input);
  if (input.age < 18 && (!risk.minorEligible || risk.risk !== "low")) {
    return {
      allowed: false,
      reason: risk.warning ?? "Diese Aufgabe ist nicht geeignet.",
    };
  }

  return { allowed: true, reason: "Die Aufgabe ist für Jugendliche geeignet." };
}

function normalizeKey(value: string | null | undefined): string {
  return (value ?? "*").trim().toLowerCase();
}

export function isKnownHelpCategory(value: string): value is HelpCategory {
  return [
    "garden",
    "shopping",
    "transport",
    "tech",
    "childcare",
    "handwork",
    "pet_care",
    "tutoring",
    "company",
    "other",
    "package",
    "noise",
    "board",
    "whohas",
  ].includes(value);
}
