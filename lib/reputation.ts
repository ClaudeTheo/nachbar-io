// Nachbar.io — Dezentes Reputationssystem
// Berechnet Community-Engagement aus bestehenden Interaktionsdaten
// Getrennt vom Admin-kontrollierten trust_level

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReputationStats } from "@/lib/supabase/types";

// ============================================================
// REPUTATION LEVELS
// ============================================================
export const REPUTATION_LEVELS = [
  { level: 1, name: "Helfer", minPoints: 0, icon: "🌱", color: "text-gray-400", bgColor: "bg-gray-100" },
  { level: 2, name: "Zuverlässiger Nachbar", minPoints: 15, icon: "🤝", color: "text-quartier-green", bgColor: "bg-quartier-green/10" },
  { level: 3, name: "Aktiver Nachbar", minPoints: 40, icon: "🏡", color: "text-info-blue", bgColor: "bg-info-blue/10" },
  { level: 4, name: "Gemeinschaftshelfer", minPoints: 80, icon: "⭐", color: "text-alert-amber", bgColor: "bg-alert-amber/10" },
  { level: 5, name: "Diamant-Helfer", minPoints: 150, icon: "💎", color: "text-purple-500", bgColor: "bg-purple-50" },
] as const;

// ============================================================
// AKTIVITAETS-BADGES
// ============================================================
export const ACTIVITY_BADGES = [
  { id: "first_aid", label: "Erste Hilfe", icon: "🩹", description: "Zuverlässig bei Soforthilfe" },
  { id: "garden_helper", label: "Gartenhilfe", icon: "🌿", description: "Grüner Daumen für die Nachbarschaft" },
  { id: "tool_sharer", label: "Werkzeug-Teiler", icon: "🔧", description: "Teilt großzügig Werkzeug" },
  { id: "neighborhood_cook", label: "Nachbarschafts-Koch", icon: "🍳", description: "Kulinarische Unterstützung" },
  { id: "pet_friend", label: "Tier-Freund", icon: "🐾", description: "Kümmert sich um Nachbars Tiere" },
  { id: "event_organizer", label: "Event-Organisator", icon: "📅", description: "Bringt die Nachbarschaft zusammen" },
  { id: "welcome_helper", label: "Willkommens-Helfer", icon: "👋", description: "Hilft vielen verschiedenen Menschen" },
  { id: "local_expert", label: "Ortskenner", icon: "📍", description: "Teilt wertvolle lokale Tipps" },
] as const;

// Punkte-Werte pro Aktionstyp
const POINTS = {
  alertResponse: 3,       // Soforthilfe geleistet
  helpCompleted: 3,       // Hilfe-Angebot abgeschlossen
  itemShared: 2,          // Artikel verschenkt/verliehen
  eventAttended: 1,       // Event teilgenommen
  endorsementReceived: 2, // Experten-Empfehlung erhalten
  reviewReceived: 3,      // Gute Bewertung erhalten (4+ Sterne)
  tipShared: 2,           // Nachbarschafts-Tipp geteilt
  neighborInvited: 50,    // Nachbar erfolgreich eingeladen
} as const;

// ============================================================
// LEVEL-BERECHNUNG
// ============================================================
export function getReputationLevel(points: number) {
  // Hoechstes Level finden, dessen Schwelle erreicht ist
  for (let i = REPUTATION_LEVELS.length - 1; i >= 0; i--) {
    if (points >= REPUTATION_LEVELS[i].minPoints) {
      return REPUTATION_LEVELS[i];
    }
  }
  return REPUTATION_LEVELS[0];
}

export function getProgressToNextLevel(points: number): {
  currentLevel: typeof REPUTATION_LEVELS[number];
  nextLevel: typeof REPUTATION_LEVELS[number] | null;
  progress: number; // 0–100
  pointsToNext: number;
} {
  const currentLevel = getReputationLevel(points);
  const currentIndex = REPUTATION_LEVELS.findIndex((l) => l.level === currentLevel.level);
  const nextLevel = currentIndex < REPUTATION_LEVELS.length - 1
    ? REPUTATION_LEVELS[currentIndex + 1]
    : null;

  if (!nextLevel) {
    return { currentLevel, nextLevel: null, progress: 100, pointsToNext: 0 };
  }

  const range = nextLevel.minPoints - currentLevel.minPoints;
  const earned = points - currentLevel.minPoints;
  const progress = Math.min(100, Math.round((earned / range) * 100));

  return {
    currentLevel,
    nextLevel,
    progress,
    pointsToNext: nextLevel.minPoints - points,
  };
}

// ============================================================
// STATS-BERECHNUNG (aus bestehenden Tabellen)
// ============================================================
export async function computeReputationStats(
  supabase: SupabaseClient,
  userId: string
): Promise<ReputationStats> {
  // Parallele Abfragen fuer alle Datenquellen
  const [
    alertsResult,
    helpResult,
    marketplaceResult,
    eventsResult,
    endorsementsResult,
    reviewsResult,
    tipsSharedResult,
    neighborsInvitedResult,
    // Badge-spezifische Abfragen
    gardenHelpResult,
    cookingHelpResult,
    petHelpResult,
    toolsSharedResult,
    eventsCreatedResult,
    uniqueHelpedResult,
  ] = await Promise.all([
    // Soforthilfe geleistet (alert_responses)
    supabase
      .from("alert_responses")
      .select("id", { count: "exact", head: true })
      .eq("responder_user_id", userId),

    // Hilfe-Aktionen abgeschlossen
    supabase
      .from("help_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "closed"),

    // Artikel verschenkt/verliehen
    supabase
      .from("marketplace_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("type", ["give", "lend"]),

    // Events besucht
    supabase
      .from("event_participants")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "going"),

    // Experten-Empfehlungen erhalten
    supabase
      .from("expert_endorsements")
      .select("id", { count: "exact", head: true })
      .eq("expert_user_id", userId),

    // Gute Bewertungen erhalten (4+ Sterne)
    supabase
      .from("expert_reviews")
      .select("id", { count: "exact", head: true })
      .eq("expert_user_id", userId)
      .gte("rating", 4),

    // Nachbarschafts-Tipps geteilt
    supabase
      .from("community_tips")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active"),

    // Nachbarn erfolgreich eingeladen
    supabase
      .from("neighbor_invitations")
      .select("id", { count: "exact", head: true })
      .eq("inviter_id", userId)
      .eq("status", "accepted"),

    // Badge: Gartenhilfe (help_requests in Kategorie garden)
    supabase
      .from("help_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("category", "garden")
      .eq("status", "closed"),

    // Badge: Koch (help_requests in Kategorie cooking — nicht in DB, aber pruefen)
    supabase
      .from("help_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("category", "company") // Naeheste Kategorie
      .eq("status", "closed"),

    // Badge: Tier-Freund
    supabase
      .from("help_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("category", "pet_care")
      .eq("status", "closed"),

    // Badge: Werkzeug-Teiler
    supabase
      .from("marketplace_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("type", ["give", "lend"])
      .eq("category", "tools"),

    // Badge: Event-Organisator (Events erstellt via events table)
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),

    // Badge: Willkommens-Helfer (verschiedene Nutzer geholfen via alert_responses)
    supabase
      .from("alert_responses")
      .select("alert_id, alert:alerts(user_id)")
      .eq("responder_user_id", userId)
      .limit(50),
  ]);

  // Zaehler extrahieren
  const alertsHelped = alertsResult.count ?? 0;
  const helpActionsCompleted = helpResult.count ?? 0;
  const itemsShared = marketplaceResult.count ?? 0;
  const eventsAttended = eventsResult.count ?? 0;
  const endorsementsReceived = endorsementsResult.count ?? 0;
  const reviewsReceived = reviewsResult.count ?? 0;
  const tipsShared = tipsSharedResult.count ?? 0;
  const neighborsInvited = neighborsInvitedResult.count ?? 0;

  // Punkte berechnen
  const points =
    alertsHelped * POINTS.alertResponse +
    helpActionsCompleted * POINTS.helpCompleted +
    itemsShared * POINTS.itemShared +
    eventsAttended * POINTS.eventAttended +
    endorsementsReceived * POINTS.endorsementReceived +
    reviewsReceived * POINTS.reviewReceived +
    tipsShared * POINTS.tipShared +
    neighborsInvited * POINTS.neighborInvited;

  // Level bestimmen
  const level = getReputationLevel(points);

  // Badges berechnen
  const badges: string[] = [];
  const BADGE_THRESHOLD = 3;

  if (alertsHelped >= BADGE_THRESHOLD) badges.push("first_aid");
  if ((gardenHelpResult.count ?? 0) >= BADGE_THRESHOLD) badges.push("garden_helper");
  if ((toolsSharedResult.count ?? 0) >= BADGE_THRESHOLD) badges.push("tool_sharer");
  if ((cookingHelpResult.count ?? 0) >= BADGE_THRESHOLD) badges.push("neighborhood_cook");
  if ((petHelpResult.count ?? 0) >= BADGE_THRESHOLD) badges.push("pet_friend");
  if ((eventsCreatedResult.count ?? 0) >= BADGE_THRESHOLD) badges.push("event_organizer");

  // Ortskenner: Tipps geteilt
  if (tipsShared >= BADGE_THRESHOLD) badges.push("local_expert");

  // Willkommens-Helfer: Verschiedene Nachbarn geholfen
  if (uniqueHelpedResult.data) {
    const uniqueUsers = new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      uniqueHelpedResult.data.map((r: any) => {
        // Supabase gibt Joins als Array zurueck
        const alert = Array.isArray(r.alert) ? r.alert[0] : r.alert;
        return alert?.user_id as string | undefined;
      }).filter(Boolean)
    );
    if (uniqueUsers.size >= BADGE_THRESHOLD) badges.push("welcome_helper");
  }

  const stats: ReputationStats = {
    points,
    level: level.level,
    levelName: level.name,
    alertsHelped,
    helpActionsCompleted,
    itemsShared,
    eventsAttended,
    endorsementsReceived,
    reviewsReceived,
    badges,
    lastComputed: new Date().toISOString(),
  };

  // Cache in users.settings speichern (JSONB-Merge)
  try {
    const { data: userData } = await supabase
      .from("users")
      .select("settings")
      .eq("id", userId)
      .single();

    const currentSettings = (userData?.settings as Record<string, unknown>) ?? {};
    await supabase
      .from("users")
      .update({ settings: { ...currentSettings, reputation: stats } })
      .eq("id", userId);
  } catch {
    // Cache-Fehler ignorieren, Stats sind trotzdem korrekt
  }

  return stats;
}

// ============================================================
// CACHED STATS LESEN (schnell, ohne Neuberechnung)
// ============================================================
export function getCachedReputation(
  settings: Record<string, unknown> | null
): ReputationStats | null {
  if (!settings?.reputation) return null;
  return settings.reputation as ReputationStats;
}
