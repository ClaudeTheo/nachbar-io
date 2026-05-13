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

export function isUserUiMode(value: unknown): value is UserUiMode {
  return typeof value === "string" && USER_UI_MODES.includes(value as UserUiMode);
}

export function getUserModeConfig(mode: UserUiMode): UserModeConfig {
  return USER_MODE_CONFIG[mode];
}
