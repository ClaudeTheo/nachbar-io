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
    description: "Missionen, sichere Gruppen und Quartier-Quest",
    postLoginPath: "/jugend",
    dashboardDensity: "playful",
    surface: {
      eyebrow: "Jugendmodus",
      title: "Quest-Map und sichere Crews",
      subtitle:
        "Der Jugendmodus bleibt als Arcade-Quest-Prototyp in Preview, bis Pilotfamilien echten Bedarf zeigen.",
      visualIntent:
        "Dunkle Map-first-Flaeche mit Mission-Deck, kooperativer Community-XP und klarer Safety Copy.",
      primaryAction: { label: "Jugendstart", href: "/jugend" },
      secondaryAction: { label: "Missionen", href: "/jugend/aufgaben" },
      principles: [
        "Preview statt Ausbau",
        "Community-XP ohne Geldwert",
        "Keine Ranglisten",
      ],
    },
  },
  active: {
    label: "Aktiv",
    description: "Erwachsener Alltag, Quartier und Hilfe",
    postLoginPath: "/dashboard",
    dashboardDensity: "standard",
    surface: {
      eyebrow: "Aktivmodus",
      title: "Heute, Quartier und Hilfe im Blick",
      subtitle:
        "Der Akquise-Modus fuer Pilotfamilien: modern, erwachsen und direkt auf die naechsten Schritte fokussiert.",
      visualIntent:
        "Ruhige Arbeitsflaeche mit weniger Kachelrauschen, klaren Bereichen und einem starken Tagesfokus.",
      primaryAction: { label: "Dashboard", href: "/dashboard" },
      secondaryAction: { label: "Karte", href: "/map" },
      principles: [
        "Erwachsener Erstkontakt",
        "Heute statt Kachelwand",
        "Verifizierter Quartierkontext",
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
      title: "Ruhig starten, selbststaendig bleiben",
      subtitle:
        "Fuer aktive Nachbarn, die selbststaendig bleiben und dabei groessere Abstaende, klare Prioritaeten und weniger Dichte moechten, ohne Pflegegefuehl.",
      visualIntent:
        "Entzerrte Oberflaeche mit groesseren Zielen, ruhiger Lesereihenfolge und selbststaendigem Alltag.",
      primaryAction: { label: "Ruhig starten", href: "/dashboard" },
      secondaryAction: { label: "Mein Tag", href: "/my-day" },
      principles: [
        "Selbststaendig bleiben",
        "Nachbarschaft bleibt sichtbar",
        "Kein Pflegegefuehl",
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
        "Maximal reduzierte Bedienung mit 80px-Zielen, sehr klarer Hierarchie und nur kosmetischer Politur ausserhalb SOS.",
      primaryAction: { label: "Einfach starten", href: "/kreis-start" },
      secondaryAction: { label: "Mein Kreis", href: "/mein-kreis" },
      principles: [
        "Notruf zuerst",
        "80px Touch-Ziele",
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
