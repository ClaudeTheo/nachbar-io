import type { ComponentType } from "react";
import { BookOpen, Clock, PowerOff, Sparkles } from "lucide-react";

export const AI_ASSISTANCE_LEVELS = [
  "off",
  "basic",
  "everyday",
  "later",
] as const;

export type AiAssistanceLevel = (typeof AI_ASSISTANCE_LEVELS)[number];
export type AiAssistanceLevelMode = "onboarding" | "settings";
export type AiConsentChoice = "yes" | "no" | "later";

export interface LevelOption {
  level: AiAssistanceLevel;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  modes: readonly AiAssistanceLevelMode[];
}

export const LEVEL_OPTIONS: readonly LevelOption[] = [
  {
    level: "off",
    label: "Aus",
    description: "Die KI-Hilfe bleibt ausgeschaltet.",
    icon: PowerOff,
    modes: ["onboarding", "settings"],
  },
  {
    level: "basic",
    label: "Basis",
    description:
      "Nach Ihrer Einwilligung: erklären, vorlesen und einfache Hilfe in der App.",
    icon: BookOpen,
    modes: ["onboarding", "settings"],
  },
  {
    level: "everyday",
    label: "Alltag",
    description:
      "Nach Ihrer Einwilligung: beim Formulieren, Verstehen und bei kleinen Fragen helfen.",
    icon: Sparkles,
    modes: ["onboarding", "settings"],
  },
  {
    level: "later",
    label: "Später entscheiden",
    description: "Sie entscheiden später in den Einstellungen.",
    icon: Clock,
    modes: ["onboarding"],
  },
];

export function getLevelOptionsForMode(mode: AiAssistanceLevelMode) {
  return LEVEL_OPTIONS.filter((option) => option.modes.includes(mode));
}

export function isAiAssistanceLevel(input: unknown): input is AiAssistanceLevel {
  return (
    typeof input === "string" &&
    (AI_ASSISTANCE_LEVELS as readonly string[]).includes(input)
  );
}

export function deriveEnabledFromLevel(level: AiAssistanceLevel): boolean {
  return level === "basic" || level === "everyday";
}

export function isActiveAiAssistanceLevel(level: AiAssistanceLevel): boolean {
  return deriveEnabledFromLevel(level);
}

export function levelToConsentChoice(
  level: AiAssistanceLevel,
): AiConsentChoice {
  if (level === "basic" || level === "everyday") return "yes";
  if (level === "off") return "no";
  return "later";
}
