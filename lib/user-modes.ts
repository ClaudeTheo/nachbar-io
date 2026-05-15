export const USER_UI_MODES = ["youth", "active", "comfort", "senior"] as const;

export type UserUiMode = (typeof USER_UI_MODES)[number];
export type UserModePostLoginPath = "/jugend" | "/dashboard" | "/kreis-start";
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
    label: "Komfort",
    description: "Ruhige Uebersicht mit mehr Klarheit",
    postLoginPath: "/dashboard",
    dashboardDensity: "calm",
    surface: {
      eyebrow: "Komfortmodus",
      title: "Ruhige Uebersicht mit klaren Wegen",
      subtitle:
        "Fuer Angehoerige und Nutzer, die weniger Dichte, groessere Abstaende und klare Prioritaeten wollen.",
      visualIntent:
        "Entzerrte Oberflaeche mit groesseren Zielen, weniger optischem Druck und klarer Lesereihenfolge.",
      primaryAction: { label: "Ruhige Uebersicht", href: "/dashboard" },
      secondaryAction: { label: "Profil", href: "/profile" },
      principles: [
        "Mehr Abstand",
        "Weniger Ablenkung",
        "Naechster Schritt klar",
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

export function getUserModeSurface(mode: UserUiMode): UserModeSurface {
  return USER_MODE_CONFIG[mode].surface;
}
