// Praevention — Kursbelohnung-Service
// Gestaffeltes Belohnungssystem: Bronze (1 Mo.) / Silber (2 Mo.) / Gold (3 Mo.) Plus gratis
// Design-Ref: docs/plans/2026-04-05-kursbelohnung-plus-trial-design.md

import { SupabaseClient } from "@supabase/supabase-js";

export type RewardTier = "none" | "bronze" | "silver" | "gold";

export interface RewardResult {
  tier: RewardTier;
  monthsGranted: number;
  caregiversGranted: number;
  upgradeHint?: string;
}

const TIER_MONTHS: Record<RewardTier, number> = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

/**
 * Belohnungsstufe fuer eine Einschreibung berechnen.
 * Bronze: Kurs abgeschlossen (>=80%)
 * Silber: + PSS-10 Pre UND Post
 * Gold: + Bewertung (min. 3 Sterne + Text)
 */
export async function calculateRewardTier(
  supabase: SupabaseClient,
  enrollmentId: string,
): Promise<RewardTier> {
  // Enrollment laden
  const { data: enrollment } = await supabase
    .from("prevention_enrollments")
    .select("id, certificate_generated, attendance_rate, pre_pss10_score, post_pss10_score")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment || !enrollment.certificate_generated) return "none";
  if ((enrollment.attendance_rate ?? 0) < 80) return "none";

  let tier: RewardTier = "bronze";

  // Silber: PSS-10 Pre + Post vorhanden
  if (
    enrollment.pre_pss10_score !== null &&
    enrollment.post_pss10_score !== null
  ) {
    tier = "silver";

    // Gold: Bewertung mit min. 3 Sterne + Text
    const { count } = await supabase
      .from("prevention_reviews")
      .select("*", { count: "exact", head: true })
      .eq("enrollment_id", enrollmentId)
      .gte("rating", 3)
      .not("text", "is", null);

    if ((count ?? 0) >= 1) {
      tier = "gold";
    }
  }

  return tier;
}

/**
 * Belohnungsstufe berechnen + in DB speichern.
 * Gibt Upgrade-Hinweis zurueck, falls hoehere Stufe erreichbar.
 */
export async function calculateAndStoreRewardTier(
  supabase: SupabaseClient,
  enrollmentId: string,
): Promise<{ tier: RewardTier; upgradeHint?: string }> {
  const tier = await calculateRewardTier(supabase, enrollmentId);

  // In DB speichern
  await supabase
    .from("prevention_enrollments")
    .update({ reward_tier: tier })
    .eq("id", enrollmentId);

  // Upgrade-Hinweise
  let upgradeHint: string | undefined;
  if (tier === "bronze") {
    upgradeHint =
      "Fuer 2 Monate Nachbar Plus: Fuellen Sie den Abschluss-Fragebogen (PSS-10) aus.";
  } else if (tier === "silver") {
    upgradeHint =
      "Fuer 3 Monate Nachbar Plus: Schreiben Sie eine kurze Bewertung zum Kurs.";
  }

  return { tier, upgradeHint };
}

/**
 * Plus-Trial an alle verbundenen Angehoerigen vergeben.
 * Erstellt plus_trial_grants + setzt caregiver_links.plus_trial_end.
 * Maximal 1 aktiver Trial pro Angehoeriger (bei mehreren Kursen: laengster gewinnt).
 */
export async function grantPlusTrial(
  supabase: SupabaseClient,
  enrollmentId: string,
  tier: RewardTier,
): Promise<RewardResult> {
  if (tier === "none") {
    return { tier, monthsGranted: 0, caregiversGranted: 0 };
  }

  const months = TIER_MONTHS[tier];

  // Enrollment laden fuer user_id
  const { data: enrollment } = await supabase
    .from("prevention_enrollments")
    .select("user_id")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment) {
    throw new Error("Einschreibung nicht gefunden");
  }

  // Aktive Angehoerige des Teilnehmers laden
  const { data: caregiverLinks } = await supabase
    .from("caregiver_links")
    .select("id, caregiver_id")
    .eq("resident_id", enrollment.user_id)
    .is("revoked_at", null);

  if (!caregiverLinks || caregiverLinks.length === 0) {
    return {
      tier,
      monthsGranted: months,
      caregiversGranted: 0,
      upgradeHint:
        "Laden Sie einen Angehoerigen ein, damit dieser von Ihrem Kursabschluss profitiert.",
    };
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);
  const expiresIso = expiresAt.toISOString();

  let granted = 0;

  for (const link of caregiverLinks) {
    // Pruefen ob bereits ein aktiver Trial fuer diesen Enrollment existiert
    const { data: existing } = await supabase
      .from("plus_trial_grants")
      .select("id, expires_at")
      .eq("enrollment_id", enrollmentId)
      .eq("caregiver_user_id", link.caregiver_id)
      .maybeSingle();

    if (existing) {
      // Tier-Upgrade: laengeren Zeitraum setzen falls noetig
      if (new Date(existing.expires_at) < expiresAt) {
        await supabase
          .from("plus_trial_grants")
          .update({
            tier,
            months_granted: months,
            expires_at: expiresIso,
          })
          .eq("id", existing.id);
      }
    } else {
      // Neuen Grant erstellen
      await supabase.from("plus_trial_grants").insert({
        enrollment_id: enrollmentId,
        caregiver_user_id: link.caregiver_id,
        tier,
        months_granted: months,
        expires_at: expiresIso,
      });
    }

    // caregiver_links.plus_trial_end auf das spaeteste Ablaufdatum setzen
    // (koennten mehrere Trials von verschiedenen Kursen laufen)
    const { data: allGrants } = await supabase
      .from("plus_trial_grants")
      .select("expires_at")
      .eq("caregiver_user_id", link.caregiver_id)
      .eq("converted_to_paid", false)
      .order("expires_at", { ascending: false })
      .limit(1);

    const latestExpiry = allGrants?.[0]?.expires_at ?? expiresIso;

    await supabase
      .from("caregiver_links")
      .update({ plus_trial_end: latestExpiry })
      .eq("id", link.id);

    granted++;
  }

  return { tier, monthsGranted: months, caregiversGranted: granted };
}

/**
 * Prueft ob ein Nutzer aktiven Plus-Zugang hat (Abo ODER Trial).
 * Kann in RLS oder Middleware genutzt werden.
 */
export async function hasPlusAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  // 1. Aktiver Trial?
  const { data: activeLink } = await supabase
    .from("caregiver_links")
    .select("id")
    .eq("caregiver_id", userId)
    .is("revoked_at", null)
    .gt("plus_trial_end", new Date().toISOString())
    .limit(1);

  if (activeLink && activeLink.length > 0) return true;

  // 2. Hier koennte spaeter Stripe-Abo-Check hinzugefuegt werden
  // Aktuell im Pilot-Modus: kein Stripe-Abo noetig
  return false;
}

/**
 * Trial-Ablauf: Downgrade und Reminder.
 * Wird vom Cron-Job aufgerufen.
 */
export async function processTrialExpiries(
  supabase: SupabaseClient,
): Promise<{ expired: number; reminded7d: number; reminded1d: number }> {
  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in1d = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

  // 1. Abgelaufene Trials: caregiver_links.plus_trial_end zuruecksetzen
  const { data: expired } = await supabase
    .from("caregiver_links")
    .select("id, caregiver_id")
    .lt("plus_trial_end", now.toISOString())
    .not("plus_trial_end", "is", null);

  if (expired) {
    for (const link of expired) {
      // Pruefen ob noch andere aktive Trials existieren
      const { data: otherGrants } = await supabase
        .from("plus_trial_grants")
        .select("expires_at")
        .eq("caregiver_user_id", link.caregiver_id)
        .gt("expires_at", now.toISOString())
        .eq("converted_to_paid", false)
        .limit(1);

      if (!otherGrants || otherGrants.length === 0) {
        // Kein aktiver Trial mehr → Trial-Ende loeschen
        await supabase
          .from("caregiver_links")
          .update({ plus_trial_end: null })
          .eq("id", link.id);
      }
    }
  }

  // 2. 7-Tage-Reminder
  const { data: remind7 } = await supabase
    .from("caregiver_links")
    .select("caregiver_id, plus_trial_end")
    .gte("plus_trial_end", now.toISOString())
    .lte("plus_trial_end", in7d.toISOString())
    .not("plus_trial_end", "is", null);

  // 3. 1-Tag-Reminder
  const { data: remind1 } = await supabase
    .from("caregiver_links")
    .select("caregiver_id, plus_trial_end")
    .gte("plus_trial_end", now.toISOString())
    .lte("plus_trial_end", in1d.toISOString())
    .not("plus_trial_end", "is", null);

  // TODO: Push-Benachrichtigungen senden (wenn Push-Service implementiert)

  return {
    expired: expired?.length ?? 0,
    reminded7d: remind7?.length ?? 0,
    reminded1d: remind1?.length ?? 0,
  };
}
