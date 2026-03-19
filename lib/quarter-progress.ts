// lib/quarter-progress.ts
// Quartier-Fortschritt: Barometer, Meilensteine, Digest-Daten
// Zeigt "X von Y Haushalten vernetzt" und feiert Meilensteine

import { SupabaseClient } from '@supabase/supabase-js';

// Meilenstein-Definitionen
export const MILESTONES = [
  { threshold: 5, message: '5 Haushalte sind jetzt vernetzt!', emoji: '🎉' },
  { threshold: 10, message: '10 Haushalte — die Nachbarschaft wächst!', emoji: '🏘️' },
  { threshold: 15, message: '15 Haushalte — Halbzeit!', emoji: '⭐' },
  { threshold: 20, message: '20 Haushalte — über die Hälfte!', emoji: '🎊' },
  { threshold: 30, message: '30 Haushalte — fast geschafft!', emoji: '🚀' },
  { threshold: 40, message: 'Alle 40 Haushalte vernetzt!', emoji: '🏆' },
] as const;

export interface QuarterProgress {
  quarterId: string;
  quarterName: string;
  connectedHouseholds: number;
  totalHouseholds: number;
  percentage: number;
  currentMilestone: typeof MILESTONES[number] | null;
  nextMilestone: typeof MILESTONES[number] | null;
  householdsToNextMilestone: number;
}

export interface WeeklyDigest {
  helpOffered: number;
  eventsCreated: number;
  newMembers: number;
  boardPosts: number;
}

/**
 * Berechnet den Fortschritt eines Quartiers.
 */
export async function getQuarterProgress(
  supabase: SupabaseClient,
  quarterId: string
): Promise<QuarterProgress | null> {
  // Quartier-Name laden
  const { data: quarter } = await supabase
    .from('quarters')
    .select('name, target_households')
    .eq('id', quarterId)
    .single();

  if (!quarter) return null;

  // Vernetzte Haushalte: Haushalte mit mindestens einem verifizierten Mitglied
  const { count: connected } = await supabase
    .from('households')
    .select('id', { count: 'exact', head: true })
    .eq('quarter_id', quarterId)
    .not('id', 'is', null);

  // Fuer die Pilotphase: Zielwert aus quarters-Tabelle oder Fallback 40
  const totalHouseholds = quarter.target_households ?? 40;
  const connectedHouseholds = connected ?? 0;
  const percentage = totalHouseholds > 0
    ? Math.min(100, Math.round((connectedHouseholds / totalHouseholds) * 100))
    : 0;

  // Meilensteine bestimmen
  const currentMilestone = [...MILESTONES]
    .reverse()
    .find(m => connectedHouseholds >= m.threshold) ?? null;

  const nextMilestone = MILESTONES.find(m => connectedHouseholds < m.threshold) ?? null;
  const householdsToNext = nextMilestone
    ? nextMilestone.threshold - connectedHouseholds
    : 0;

  return {
    quarterId,
    quarterName: quarter.name,
    connectedHouseholds,
    totalHouseholds,
    percentage,
    currentMilestone,
    nextMilestone,
    householdsToNextMilestone: householdsToNext,
  };
}

/**
 * Berechnet Wochen-Digest-Daten fuer ein Quartier.
 */
export async function getWeeklyDigest(
  supabase: SupabaseClient,
  quarterId: string
): Promise<WeeklyDigest> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  // Board-Posts diese Woche
  const { count: boardPosts } = await supabase
    .from('board_posts')
    .select('id', { count: 'exact', head: true })
    .eq('quarter_id', quarterId)
    .gte('created_at', sevenDaysAgo);

  // Hilfsangebote (category = help_offered)
  const { count: helpOffered } = await supabase
    .from('board_posts')
    .select('id', { count: 'exact', head: true })
    .eq('quarter_id', quarterId)
    .eq('category', 'help_offered')
    .gte('created_at', sevenDaysAgo);

  // Events diese Woche
  const { count: eventsCreated } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('quarter_id', quarterId)
    .gte('created_at', sevenDaysAgo);

  // Neue Mitglieder (household_members diese Woche verifiziert)
  const { count: newMembers } = await supabase
    .from('household_members')
    .select('id', { count: 'exact', head: true })
    .gte('verified_at', sevenDaysAgo);

  return {
    helpOffered: helpOffered ?? 0,
    eventsCreated: eventsCreated ?? 0,
    newMembers: newMembers ?? 0,
    boardPosts: boardPosts ?? 0,
  };
}
