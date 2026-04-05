// Gamification Badge Service — prueft Badge-Bedingungen und vergibt neue Abzeichen
// 7 Badges: Erster Beitrag, Helfende Hand, Gastgeber, Fruehaufsteher,
//           Gartenfreund, Quartiers-Kenner, Einladungs-Champion

import { SupabaseClient } from "@supabase/supabase-js";

export interface BadgeDefinition {
  key: string;
  title: string;
  description: string;
  icon: string;
  check: (supabase: SupabaseClient, userId: string) => Promise<boolean>;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    key: "erster_beitrag",
    title: "Erster Beitrag",
    description: "Ersten Board-Post oder Gruppen-Beitrag erstellt",
    icon: "✏️",
    check: async (supabase, userId) => {
      const { count } = await supabase
        .from("points_log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("action", ["board_post", "group_post"]);
      return (count ?? 0) >= 1;
    },
  },
  {
    key: "helfende_hand",
    title: "Helfende Hand",
    description: "5 Hilfe-Anfragen beantwortet",
    icon: "🤝",
    check: async (supabase, userId) => {
      const { count } = await supabase
        .from("points_log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action", "help_match");
      return (count ?? 0) >= 5;
    },
  },
  {
    key: "gastgeber",
    title: "Gastgeber",
    description: "3 Events erstellt",
    icon: "⭐",
    check: async (supabase, userId) => {
      const { count } = await supabase
        .from("points_log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action", "event_create");
      return (count ?? 0) >= 3;
    },
  },
  {
    key: "fruehaufsteher",
    title: "Frühaufsteher",
    description: "10 Check-ins vor 9 Uhr",
    icon: "☀️",
    check: async (supabase, userId) => {
      // Alle Check-in-Eintraege laden und nach Uhrzeit filtern
      const { data } = await supabase
        .from("points_log")
        .select("created_at")
        .eq("user_id", userId)
        .eq("action", "checkin");

      if (!data) return false;
      const earlyCount = data.filter((row) => {
        const hour = new Date(row.created_at).getHours();
        return hour < 9;
      }).length;
      return earlyCount >= 10;
    },
  },
  {
    key: "gartenfreund",
    title: "Gartenfreund",
    description: "Mitglied in einer Gruppe",
    icon: "🌻",
    check: async (supabase, userId) => {
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      return (count ?? 0) >= 1;
    },
  },
  {
    key: "quartiers_kenner",
    title: "Quartiers-Kenner",
    description: "30 Tage aktiv (Check-ins an 30 verschiedenen Tagen)",
    icon: "🧭",
    check: async (supabase, userId) => {
      const { data } = await supabase
        .from("points_log")
        .select("created_at")
        .eq("user_id", userId)
        .eq("action", "checkin");

      if (!data) return false;
      const uniqueDays = new Set(
        data.map((row) => new Date(row.created_at).toISOString().slice(0, 10)),
      );
      return uniqueDays.size >= 30;
    },
  },
  {
    key: "einladungs_champion",
    title: "Einladungs-Champion",
    description: "3 Nachbarn eingeladen",
    icon: "📣",
    check: async (supabase, userId) => {
      const { count } = await supabase
        .from("invite_codes")
        .select("*", { count: "exact", head: true })
        .eq("created_by", userId)
        .not("used_by", "is", null);
      return (count ?? 0) >= 3;
    },
  },
  {
    key: "achtsamkeits_meister",
    title: "Achtsamkeits-Meister",
    description: "Praeventionskurs erfolgreich abgeschlossen (8 Wochen)",
    icon: "🧘",
    check: async (supabase, userId) => {
      // Mindestens eine abgeschlossene Kurs-Einschreibung
      const { count } = await supabase
        .from("prevention_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("completed_at", "is", null);
      return (count ?? 0) >= 1;
    },
  },
];

/** Alle Badge-Bedingungen pruefen und neue Badges vergeben */
export async function checkAndAwardBadges(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  // Bereits verdiente Badges laden
  const { data: earned } = await supabase
    .from("user_badges")
    .select("badge_key")
    .eq("user_id", userId);

  const earnedKeys = new Set((earned ?? []).map((b) => b.badge_key));
  const newBadges: string[] = [];

  for (const badge of BADGE_DEFINITIONS) {
    if (earnedKeys.has(badge.key)) continue;

    try {
      const met = await badge.check(supabase, userId);
      if (met) {
        const { error } = await supabase
          .from("user_badges")
          .insert({ user_id: userId, badge_key: badge.key });

        if (!error) {
          newBadges.push(badge.key);
        }
      }
    } catch (err) {
      console.error(
        `[gamification] Badge-Check fehlgeschlagen: ${badge.key}`,
        err,
      );
    }
  }

  return newBadges;
}

/** Alle Badges eines Nutzers laden (verdient + nicht verdient) */
export async function getUserBadges(supabase: SupabaseClient, userId: string) {
  const { data: earned } = await supabase
    .from("user_badges")
    .select("badge_key, earned_at")
    .eq("user_id", userId)
    .order("earned_at", { ascending: true });

  const earnedMap = new Map(
    (earned ?? []).map((b) => [b.badge_key, b.earned_at]),
  );

  return BADGE_DEFINITIONS.map((badge) => ({
    key: badge.key,
    title: badge.title,
    description: badge.description,
    icon: badge.icon,
    earned: earnedMap.has(badge.key),
    earnedAt: earnedMap.get(badge.key) ?? null,
  }));
}
