// lib/referral-rewards.ts
// Referral-Belohnungssystem — Feature-Flag-gesteuert (REFERRAL_REWARDS)
// Belohnungen fuer erfolgreiche Einladungen:
// - 3 konvertierte Einladungen -> Marktplatz-Limit 3 -> 10
// - 5 konvertierte Einladungen -> Premium-Feature freigeschaltet
// Keine Gamification, kein Leaderboard — nur stille Freischaltung + Danke-Nachricht

import { SupabaseClient } from '@supabase/supabase-js';
import { checkFeatureAccess, type UserContext } from '@/lib/feature-flags';

// Belohnungs-Schwellen
export const REWARD_TIERS = [
  {
    threshold: 3,
    key: 'marketplace_extended',
    description: 'Marktplatz-Limit erhöht (3 → 10 Anzeigen)',
    notificationTitle: 'Danke für 3 erfolgreiche Einladungen!',
    notificationBody: 'Ihr Marktplatz-Limit wurde auf 10 Anzeigen erhöht.',
  },
  {
    threshold: 5,
    key: 'referral_premium',
    description: 'Premium-Quartier-Einblicke freigeschaltet',
    notificationTitle: 'Danke für 5 erfolgreiche Einladungen!',
    notificationBody: 'Sie haben Zugang zu erweiterten Quartier-Einblicken erhalten.',
  },
] as const;

export type RewardKey = typeof REWARD_TIERS[number]['key'];

/**
 * Prueft und vergibt Referral-Belohnungen nach einer erfolgreichen Konversion.
 * Wird nach trackInviteConversion() aufgerufen.
 *
 * Hinter Feature-Flag REFERRAL_REWARDS (initial deaktiviert).
 */
export async function checkAndGrantRewards(
  supabase: SupabaseClient,
  inviterId: string,
  userContext: UserContext
): Promise<{ granted: RewardKey[]; alreadyHad: RewardKey[] }> {
  const granted: RewardKey[] = [];
  const alreadyHad: RewardKey[] = [];

  // Feature-Flag pruefen
  const flagEnabled = await checkFeatureAccess('REFERRAL_REWARDS', userContext);
  if (!flagEnabled) {
    return { granted, alreadyHad };
  }

  // Anzahl konvertierter Einladungen zaehlen
  const { count } = await supabase
    .from('neighbor_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('inviter_id', inviterId)
    .in('status', ['converted', 'accepted']);

  const convertedCount = count ?? 0;

  // Bestehende Belohnungen laden
  const { data: existingRewards } = await supabase
    .from('reputation_points')
    .select('reason')
    .eq('user_id', inviterId)
    .like('reason', 'referral_reward_%');

  const existingKeys = new Set(
    (existingRewards ?? []).map(r => r.reason.replace('referral_reward_', ''))
  );

  // Belohnungen pruefen und vergeben
  for (const tier of REWARD_TIERS) {
    if (convertedCount >= tier.threshold) {
      if (existingKeys.has(tier.key)) {
        alreadyHad.push(tier.key);
        continue;
      }

      // Belohnung vergeben: Punkte + Benachrichtigung
      await supabase.from('reputation_points').insert({
        user_id: inviterId,
        points: tier.threshold * 20,
        reason: `referral_reward_${tier.key}`,
        reference_id: inviterId,
      });

      // Benachrichtigung (fire-and-forget)
      try {
        await supabase.from('notifications').insert({
          user_id: inviterId,
          type: 'referral_reward',
          title: tier.notificationTitle,
          body: tier.notificationBody,
          reference_type: 'reward',
        });
      } catch {
        // Nicht blockierend
      }

      granted.push(tier.key);
    }
  }

  return { granted, alreadyHad };
}

/**
 * Prueft ob ein Nutzer eine bestimmte Referral-Belohnung hat.
 */
export async function hasReward(
  supabase: SupabaseClient,
  userId: string,
  rewardKey: RewardKey
): Promise<boolean> {
  const { count } = await supabase
    .from('reputation_points')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('reason', `referral_reward_${rewardKey}`);

  return (count ?? 0) > 0;
}

/**
 * Gibt das Marktplatz-Limit fuer einen Nutzer zurueck.
 * Standard: 3, mit Referral-Belohnung: 10.
 */
export async function getMarketplaceLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const extended = await hasReward(supabase, userId, 'marketplace_extended');
  return extended ? 10 : 3;
}
