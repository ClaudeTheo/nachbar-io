export const USER_UI_MODES = ["youth", "active", "comfort", "senior"] as const;

export type UserUiMode = (typeof USER_UI_MODES)[number];
export type UserModePostLoginPath = "/jugend" | "/dashboard" | "/kreis-start" | "/admin";
export type DashboardDensity = "playful" | "standard" | "calm" | "simple";

export interface UserModeSurface {
  eyebrow: string;
  title: string;
  subtitle: string;
  visualIntent: string;
  primaryAction: {
    label: string;
    href: UserModePostLoginPath;
  };
  secondaryAction: {
    label: string;
    href: string;
  };
  principles: readonly [string, string, string];
}

export interface UserModeConfig {
  label: string;
  description: string;
  postLoginPath: UserModePostLoginPath;
  dashboardDensity: DashboardDensity;
  surface: UserModeSurface;
}

export const USER_MODE_CONFIG = {
  youth: {
    label: "Junges Quartier",
    description: "Mithelfen, Punkte sammeln, Events entdecken",
    postLoginPath: "/jugend",
    dashboardDensity: "playful",
    surface: {
      eyebrow: "Jugendmodus",
      title: "Karte, Missionen und Gruppen",
      subtitle:
        "Der Einstieg fuer junge Nachbarn: Aufgaben sehen, sichere Gruppen finden und Quartier-Punkte sammeln.",
      visualIntent:
        "Dunkle Map-first-Flaeche mit klaren Aktivitaets-Pins und spielerischer Energie.",
      primaryAction: { label: "Jugendstart", href: "/jugend" },
      secondaryAction: { label: "Missionen", href: "/jugend/missionen" },
      principles: [
        "Karte zuerst",
        "Punkte nur mit Schutzregeln",
        "Keine Adressen im Client",
      ],
    },
  },
  active: {
    label: "Aktiv",
    description: "Nachbarschaft, Alltag und lokale Infos",
    postLoginPath: "/dashboard",
    dashboardDensity: "standard",
    surface: {
      eyebrow: "Aktivmodus",
      title: "Alles fuer den Alltag schnell im Blick",
      subtitle:
        "Der normale Arbeitsmodus fuer Nachbarn, die Karte, Nachrichten und Hilfe selbststaendig nutzen.",
      visualIntent:
        "Dichte, ruhige Tagesuebersicht mit klaren Schnellzugriffen und Quartier-Kontext.",
      primaryAction: { label: "Dashboard", href: "/dashboard" },
      secondaryAction: { label: "Karte", href: "/map" },
      principles: [
        "Schnellzugriffe sichtbar",
        "Karte und Heute im Fokus",
        "Quartierdaten nur verifiziert",
      ],
    },
  },
  comfort: {
    label: "Aktiv 55+",
    description: "Ruhiger Alltag, Nachbarschaft und klare Wege",
    postLoginPath: "/dashboard",
    dashboardDensity: "calm",
    surface: {
      eyebrow: "Aktiv 55+",
      title: "Ruhiger Ueberblick fuer aktive Nachbarn",
      subtitle:
        "Fuer Menschen, die die QuartierApp selbststaendig nutzen und dabei groessere Abstaende, klare Prioritaeten und weniger Dichte moechten.",
      visualIntent:
        "Entzerrte Oberflaeche mit groesseren Zielen, ruhiger Lesereihenfolge und Alltag vor Pflege.",
      primaryAction: { label: "Ruhig starten", href: "/dashboard" },
      secondaryAction: { label: "Mein Tag", href: "/my-day" },
      principles: [
        "Ruhiger Alltag",
        "Nachbarschaft bleibt sichtbar",
        "Sicherheit ohne Pflegegefuehl",
      ],
    },
  },
  senior: {
    label: "Einfach",
    description: "Grosse Buttons und einfache Wege",
    postLoginPath: "/kreis-start",
    dashboardDensity: "simple",
    surface: {
      eyebrow: "Seniorenmodus",
      title: "Grosse Tasten. Notruf zuerst.",
      subtitle:
        "Der einfachste Einstieg mit vier Kacheln, kurzen Wegen und dauerhaft klarer Sicherheitslogik.",
      visualIntent:
        "Maximal reduzierte Bedienung mit 80px-Zielen, sehr klarer Hierarchie und ruhigem Text.",
      primaryAction: { label: "Einfach starten", href: "/kreis-start" },
      secondaryAction: { label: "Mein Kreis", href: "/mein-kreis" },
      principles: [
        "Notruf zuerst",
        "Vier grosse Kacheln",
        "Maximal vier Taps pro Aktion",
      ],
    },
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
    "Ruhigere Uebersicht, groessere Abstaende und klare Wege",
    "Gut fuer aktive Nachbarn ab 55, die selbststaendig bleiben moechten",
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

export function getUserModeSurface(mode: UserUiMode): UserModeSurface {
  return USER_MODE_CONFIG[mode].surface;
}
