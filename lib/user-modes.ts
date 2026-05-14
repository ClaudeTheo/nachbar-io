export const USER_UI_MODES = ["youth", "active", "comfort", "senior"] as const;

export type UserUiMode = (typeof USER_UI_MODES)[number];
export type UserModePostLoginPath = "/jugend" | "/dashboard" | "/kreis-start";
export type DashboardDensity = "playful" | "standard" | "calm" | "simple";

interface UserModeConfig {
  label: string;
  description: string;
  postLoginPath: UserModePostLoginPath;
  dashboardDensity: DashboardDensity;
}

export const USER_MODE_CONFIG = {
  youth: {
    label: "Junges Quartier",
    description: "Mithelfen, Punkte sammeln, Events entdecken",
    postLoginPath: "/jugend",
    dashboardDensity: "playful",
  },
  active: {
    label: "Aktiv",
    description: "Nachbarschaft, Alltag und lokale Infos",
    postLoginPath: "/dashboard",
    dashboardDensity: "standard",
  },
  comfort: {
    label: "Komfort",
    description: "Ruhige Uebersicht mit mehr Klarheit",
    postLoginPath: "/dashboard",
    dashboardDensity: "calm",
  },
  senior: {
    label: "Einfach",
    description: "Grosse Buttons und einfache Wege",
    postLoginPath: "/kreis-start",
    dashboardDensity: "simple",
  },
} satisfies Record<UserUiMode, UserModeConfig>;

export const USER_MODE_ONBOARDING_INTROS = {
  youth: [
    "Missionen, Treffen und Lernen im Quartier",
    "Sichtbar nur mit Freigabe und passenden Schutzregeln",
  ],
  active: [
    "Nachrichten, Karte und kleine Alltagshilfen schnell erreichen",
    "Gut fuer Menschen, die die App selbststaendig nutzen",
  ],
  comfort: [
    "Weniger Ablenkung, ruhigere Uebersichten und klare Wege",
    "Gut fuer Angehoerige oder alle, die Struktur bevorzugen",
  ],
  senior: [
    "Grosse Schaltflaechen, einfache Sprache und kurze Wege",
    "Gut fuer Begleitung, Alltag und die Senior-Ansicht",
  ],
} satisfies Record<UserUiMode, string[]>;

export function isUserUiMode(value: unknown): value is UserUiMode {
  return typeof value === "string" && USER_UI_MODES.includes(value as UserUiMode);
}

export function getUserModeConfig(mode: UserUiMode): UserModeConfig {
  return USER_MODE_CONFIG[mode];
}
