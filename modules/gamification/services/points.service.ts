// Gamification Points Service — serverseitige Punkte-Vergabe mit Tages-Limits
// Punkte werden NICHT vom Client vergeben. Der Server prueft bei jeder relevanten Aktion.

import { SupabaseClient } from "@supabase/supabase-js";
import { POINTS_CONFIG, ONE_TIME_ACTIONS, LEVEL_THRESHOLDS } from "./constants";

export interface AwardResult {
  awarded: boolean;
  points: number;
  totalPoints: number;
  level: number;
}

/** Punkte vergeben — prueft Tages-Limit, schreibt points_log, aktualisiert users */
export async function awardPoints(
  supabase: SupabaseClient,
  userId: string,
  action: string,
): Promise<AwardResult> {
  const config = POINTS_CONFIG[action];
  if (!config) {
    console.warn(`[gamification] Unbekannte Aktion: ${action}`);
    return { awarded: false, points: 0, totalPoints: 0, level: 1 };
  }

  // Einmalige Aktionen: pruefen ob bereits vergeben
  if (ONE_TIME_ACTIONS.includes(action)) {
    const { count } = await supabase
      .from("points_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", action);

    if ((count ?? 0) > 0) {
      return getCurrentPoints(supabase, userId);
    }
  } else {
    // Tages-Limit pruefen
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("points_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", action)
      .gte("created_at", todayStart.toISOString());

    if ((count ?? 0) >= config.dailyLimit) {
      return getCurrentPoints(supabase, userId);
    }
  }

  // Punkte in Log schreiben
  const { error: logError } = await supabase
    .from("points_log")
    .insert({ user_id: userId, action, points: config.points });

  if (logError) {
    console.error("[gamification] points_log insert failed:", logError);
    return getCurrentPoints(supabase, userId);
  }

  // Aggregat aktualisieren: total_points + level neu berechnen
  const { data: userData } = await supabase
    .from("users")
    .select("total_points")
    .eq("id", userId)
    .single();

  const newTotal = (userData?.total_points ?? 0) + config.points;
  const newLevel = calculateLevel(newTotal);

  const { error: updateError } = await supabase
    .from("users")
    .update({ total_points: newTotal, points_level: newLevel })
    .eq("id", userId);

  if (updateError) {
    console.error("[gamification] users update failed:", updateError);
  }

  return {
    awarded: true,
    points: config.points,
    totalPoints: newTotal,
    level: newLevel,
  };
}

/** Level aus Punktestand berechnen */
export function calculateLevel(totalPoints: number): number {
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (totalPoints >= threshold.points) {
      level = threshold.level;
    }
  }
  return level;
}

/** Aktuelle Punkte + Level eines Nutzers (ohne Vergabe) */
async function getCurrentPoints(
  supabase: SupabaseClient,
  userId: string,
): Promise<AwardResult> {
  const { data } = await supabase
    .from("users")
    .select("total_points, points_level")
    .eq("id", userId)
    .single();

  return {
    awarded: false,
    points: 0,
    totalPoints: data?.total_points ?? 0,
    level: data?.points_level ?? 1,
  };
}

/** Punkte-Info fuer Profil: Total, Level, naechstes Level, Fortschritt */
export async function getPointsInfo(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("users")
    .select("total_points, points_level")
    .eq("id", userId)
    .single();

  const totalPoints = data?.total_points ?? 0;
  const currentLevel = data?.points_level ?? 1;
  const current =
    LEVEL_THRESHOLDS.find((l) => l.level === currentLevel) ??
    LEVEL_THRESHOLDS[0];
  const next = LEVEL_THRESHOLDS.find((l) => l.level === currentLevel + 1);

  return {
    totalPoints,
    level: currentLevel,
    title: current.title,
    icon: current.icon,
    nextLevel: next
      ? {
          level: next.level,
          title: next.title,
          pointsNeeded: next.points,
          progress:
            next.points > current.points
              ? Math.min(
                  100,
                  Math.round(
                    ((totalPoints - current.points) /
                      (next.points - current.points)) *
                      100,
                  ),
                )
              : 100,
        }
      : null,
  };
}

/** Punkte-Historie (paginiert) */
export async function getPointsLog(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
  offset = 0,
) {
  const { data, error } = await supabase
    .from("points_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[gamification] points_log select failed:", error);
    return [];
  }
  return data ?? [];
}
