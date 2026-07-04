import { USER_UI_MODES, type UserUiMode } from "@/lib/user-modes";

export type GenerationDesignPriority =
  | "pilot-primary"
  | "pilot-secondary"
  | "protected"
  | "preview-only";

export type GenerationMotionLevel = "still" | "subtle" | "playful";

export interface GenerationCommunityXp {
  label: string;
  value: string;
  note: string;
  status: "ui-only-read-only";
}

export interface GenerationDesignTokens {
  mode: UserUiMode;
  priority: GenerationDesignPriority;
  stageLabel: string;
  densityLabel: string;
  motion: GenerationMotionLevel;
  containerClass: string;
  tileClass: string;
  accentClass: string;
  accentSoftClass: string;
  iconWrapClass: string;
  textClass: string;
  mutedTextClass: string;
  borderClass: string;
  radiusClass: string;
  preview: {
    headline: string;
    subline: string;
    metricLabel: string;
    metricValue: string;
    metricNote: string;
  };
  focus: readonly [string, string, string];
  guardrails: readonly [string, string, string];
  communityXp?: GenerationCommunityXp;
  forbiddenPatterns?: readonly string[];
}

export const GENERATION_DESIGN = {
  youth: {
    mode: "youth",
    priority: "preview-only",
    stageLabel: "Preview geparkt",
    densityLabel: "Spielerisch",
    motion: "playful",
    containerClass:
      "border-cyan-200/24 bg-[#071923] text-white shadow-[0_24px_70px_rgba(7,25,35,0.32)]",
    tileClass: "border-white/12 bg-white/[0.075] text-white",
    accentClass: "bg-lime-300 text-[#071923]",
    accentSoftClass: "bg-lime-300/12 text-lime-100",
    iconWrapClass: "bg-cyan-200/10 text-lime-200",
    textClass: "text-white",
    mutedTextClass: "text-cyan-50/72",
    borderClass: "border-cyan-100/18",
    radiusClass: "rounded-[22px]",
    preview: {
      headline: "Quest-Map, Missionen, Crew",
      subline:
        "Arcade-Quest als lokale Vorschau, bis echte Pilotfamilien Jugendbedarf zeigen.",
      metricLabel: "Community-XP",
      metricValue: "Preview",
      metricNote: "Nur Anzeige, kein neues Schema.",
    },
    focus: [
      "Map-first Quest-Board",
      "Kooperative Community-XP",
      "Elternfreigabe und Safety Copy",
    ],
    guardrails: [
      "Keine Ranglisten",
      "Keine Streaks",
      "Keine Geldlogik",
    ],
    communityXp: {
      label: "Gemeinschafts-XP",
      value: "UI-only",
      note: "Read-only Anerkennung ohne Geldwert, Auszahlung oder Konkurrenz.",
      status: "ui-only-read-only",
    },
    forbiddenPatterns: ["leaderboard", "streak", "cashout"],
  },
  active: {
    mode: "active",
    priority: "pilot-primary",
    stageLabel: "Pilot zuerst",
    densityLabel: "Klar und kompakt",
    motion: "subtle",
    containerClass:
      "border-[#d9e5dc] bg-[#fbfffc] text-[#26352f] shadow-[0_18px_48px_rgba(38,53,47,0.08)]",
    tileClass: "border-[#d9e5dc] bg-white text-[#26352f]",
    accentClass: "bg-[#2f7a62] text-white",
    accentSoftClass: "bg-[#e4f3ec] text-[#245f49]",
    iconWrapClass: "bg-[#e4f3ec] text-[#2f7a62]",
    textClass: "text-[#26352f]",
    mutedTextClass: "text-[#60736a]",
    borderClass: "border-[#d9e5dc]",
    radiusClass: "rounded-[18px]",
    preview: {
      headline: "Heute, Quartier, Hilfe",
      subline:
        "Erwachsener Start fuer Pilotfamilien: weniger Kachellaerm, mehr Orientierung.",
      metricLabel: "Akquise-Hebel",
      metricValue: "hoch",
      metricNote: "Erstkontakt fuer erwachsene Kinder und Nachbarn.",
    },
    focus: [
      "Heute wichtig",
      "Quartier schnell erreichbar",
      "Hilfe und Nachrichten sichtbar",
    ],
    guardrails: [
      "Keine neuen Datenfluesse",
      "Kein Onboarding-Umbau",
      "Invite-Regeln bleiben",
    ],
  },
  comfort: {
    mode: "comfort",
    priority: "pilot-primary",
    stageLabel: "Pilot zuerst",
    densityLabel: "Ruhig und luftig",
    motion: "subtle",
    containerClass:
      "border-[#c9d8d1] bg-[#f7fbf9] text-[#243b34] shadow-[0_18px_48px_rgba(36,59,52,0.08)]",
    tileClass: "border-[#d7e2dd] bg-white text-[#243b34]",
    accentClass: "bg-[#2d6a4f] text-white",
    accentSoftClass: "bg-[#dce9e2] text-[#244f3e]",
    iconWrapClass: "bg-[#dce9e2] text-[#2d6a4f]",
    textClass: "text-[#243b34]",
    mutedTextClass: "text-[#60746b]",
    borderClass: "border-[#d7e2dd]",
    radiusClass: "rounded-[20px]",
    preview: {
      headline: "Ruhig starten, sicher handeln",
      subline:
        "Aktiv 55+ wirkt selbststaendig und klar, ohne Pflegegefuehl.",
      metricLabel: "Dichte",
      metricValue: "reduziert",
      metricNote: "Groessere Abstaende und weniger gleichzeitige Signale.",
    },
    focus: [
      "Groessere Ziele",
      "Alltag vor Pflege",
      "Weniger Dichte",
    ],
    guardrails: [
      "Keine Senioren-Sprache",
      "Keine Pflege-Optik",
      "Sicherheit bleibt sichtbar",
    ],
  },
  senior: {
    mode: "senior",
    priority: "protected",
    stageLabel: "Geschuetzte Flaeche",
    densityLabel: "Sehr einfach",
    motion: "still",
    containerClass:
      "border-[#f1d6d6] bg-white text-[#2d3142] shadow-[0_18px_48px_rgba(45,49,66,0.08)]",
    tileClass: "border-[#eadede] bg-white text-[#2d3142]",
    accentClass: "bg-emergency-red text-white",
    accentSoftClass: "bg-red-50 text-emergency-red",
    iconWrapClass: "bg-red-50 text-emergency-red",
    textClass: "text-[#2d3142]",
    mutedTextClass: "text-[#555b66]",
    borderClass: "border-[#eadede]",
    radiusClass: "rounded-[20px]",
    preview: {
      headline: "Grosse Tasten, Notruf zuerst",
      subline:
        "Nur kosmetische Politur ausserhalb kritischer SOS- und 112-Flaechen.",
      metricLabel: "Touch-Ziel",
      metricValue: "80 px",
      metricNote: "Senior-Regel bleibt verbindlich.",
    },
    focus: [
      "Notruf zuerst",
      "80px Touch-Targets",
      "Maximal vier Taps",
    ],
    guardrails: [
      "SOS byte-identisch",
      "4.5:1 Kontrast",
      "FMEA-Brille",
    ],
  },
} satisfies Record<UserUiMode, GenerationDesignTokens>;

export const GENERATION_DESIGN_MODES = USER_UI_MODES;

export function getGenerationDesign(mode: UserUiMode): GenerationDesignTokens {
  return GENERATION_DESIGN[mode];
}
