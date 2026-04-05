// Gamification-Konstanten — Punkte-Aktionen, Limits, Level-Stufen
// Design: docs/plans/2026-04-05-gamification-design.md

export const POINTS_CONFIG: Record<
  string,
  { points: number; dailyLimit: number }
> = {
  checkin: { points: 5, dailyLimit: 1 },
  board_post: { points: 10, dailyLimit: 3 },
  help_offer: { points: 15, dailyLimit: 2 },
  help_match: { points: 20, dailyLimit: 2 },
  marketplace_gift: { points: 10, dailyLimit: 3 },
  event_create: { points: 15, dailyLimit: 1 },
  event_join: { points: 5, dailyLimit: 2 },
  group_post: { points: 5, dailyLimit: 5 },
  group_create: { points: 20, dailyLimit: 1 },
  profile_complete: { points: 50, dailyLimit: 1 },
  first_invite: { points: 30, dailyLimit: 1 },
  streak_7_days: { points: 25, dailyLimit: 1 },
  prevention_daily: { points: 10, dailyLimit: 1 },
  prevention_weekly: { points: 25, dailyLimit: 1 },
};

// Einmalige Aktionen — werden nur 1x im Leben vergeben
export const ONE_TIME_ACTIONS = ["profile_complete", "first_invite"];

export const LEVEL_THRESHOLDS = [
  { level: 1, points: 0, title: "Neuer Nachbar", icon: "🌱" },
  { level: 2, points: 50, title: "Aktiver Nachbar", icon: "🌿" },
  { level: 3, points: 150, title: "Engagierter Nachbar", icon: "🌸" },
  { level: 4, points: 400, title: "Verlässlicher Nachbar", icon: "🌳" },
  { level: 5, points: 1000, title: "Quartiers-Held", icon: "🌟" },
];

// Lesbare Aktionsnamen fuer UI-Anzeige
export const ACTION_LABELS: Record<string, string> = {
  checkin: "Check-in",
  board_post: "Board-Beitrag",
  help_offer: "Hilfe angeboten",
  help_match: "Hilfe vermittelt",
  marketplace_gift: "Verschenkt",
  event_create: "Event erstellt",
  event_join: "Event beigetreten",
  group_post: "Gruppen-Beitrag",
  group_create: "Gruppe gegründet",
  profile_complete: "Profil vervollständigt",
  first_invite: "Ersten Nachbarn eingeladen",
  streak_7_days: "7-Tage-Streak",
  prevention_daily: "Tägliche Übung",
  prevention_weekly: "Wochen-Sitzung",
};
