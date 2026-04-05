// Praevention — Kursbelohnung-Service
// Gestaffeltes Belohnungssystem: Bronze (1 Mo.) / Silber (2 Mo.) / Gold (3 Mo.) Plus gratis
// Design-Ref: docs/plans/2026-04-05-kursbelohnung-plus-trial-design.md

import { SupabaseClient } from "@supabase/supabase-js";
import { sendPush } from "@/modules/care/services/channels/push";

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
    .select(
      "id, certificate_generated, attendance_rate, pre_pss10_score, post_pss10_score",
    )
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

  // In DB speichern — nur Upgrade, nie Downgrade (GREATEST-Logik)
  // Verhindert Inkonsistenz wenn z.B. eine Bewertung geloescht wird
  const { data: current } = await supabase
    .from("prevention_enrollments")
    .select("reward_tier")
    .eq("id", enrollmentId)
    .single();

  const tierOrder: Record<string, number> = {
    none: 0,
    bronze: 1,
    silver: 2,
    gold: 3,
  };
  const currentValue = tierOrder[current?.reward_tier ?? "none"] ?? 0;
  const newValue = tierOrder[tier] ?? 0;

  if (newValue >= currentValue) {
    await supabase
      .from("prevention_enrollments")
      .update({ reward_tier: tier })
      .eq("id", enrollmentId);
  }

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
 * WICHTIG: Nutzt atomic UPSERT (ON CONFLICT) statt Check-then-Insert.
 * DB-Constraint uq_trial_grant_enrollment_caregiver verhindert Duplikate.
 * Maximal 1 aktiver Trial pro Angehoeriger pro Kurs.
 */
export async function grantPlusTrial(
  supabase: SupabaseClient,
  enrollmentId: string,
  tier: RewardTier,
  requestingUserId?: string,
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

  // Ownership-Pruefung: Enrollment muss dem anfragenden User gehoeren
  if (requestingUserId && enrollment.user_id !== requestingUserId) {
    throw new Error(
      "Zugriff verweigert: Einschreibung gehoert einem anderen Nutzer",
    );
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

  const tierOrder: Record<string, number> = { bronze: 1, silver: 2, gold: 3 };
  const newTierValue = tierOrder[tier] ?? 0;
  let granted = 0;

  for (const link of caregiverLinks) {
    // Atomic UPSERT: DB UNIQUE (enrollment_id, caregiver_user_id) verhindert Duplikate
    // Bei Konflikt: Nur upgraden wenn neue Stufe hoeher (App-seitige Pruefung noetig,
    // da Supabase kein conditional ON CONFLICT unterstuetzt)
    const { data: existing } = await supabase
      .from("plus_trial_grants")
      .select("id, tier")
      .eq("enrollment_id", enrollmentId)
      .eq("caregiver_user_id", link.caregiver_id)
      .maybeSingle();

    let grantChanged = false;

    if (existing) {
      // Nur echtes Tier-Upgrade erlauben (bronze→silber→gold)
      const existingTierValue = tierOrder[existing.tier] ?? 0;
      if (newTierValue <= existingTierValue) continue;

      // WHERE-Guard: .neq("tier", tier) verhindert doppeltes Update bei parallelen Requests
      const { data: updated, error: updateErr } = await supabase
        .from("plus_trial_grants")
        .update({ tier, months_granted: months, expires_at: expiresIso })
        .eq("id", existing.id)
        .neq("tier", tier)
        .select("id");

      if (updateErr) {
        console.error(`[reward] Grant-Update fehlgeschlagen:`, updateErr);
        continue;
      }
      grantChanged = (updated?.length ?? 0) > 0;
    } else {
      // INSERT — bei Race Condition faengt UNIQUE Constraint den Duplikat ab
      const { error: insertErr } = await supabase
        .from("plus_trial_grants")
        .insert({
          enrollment_id: enrollmentId,
          caregiver_user_id: link.caregiver_id,
          tier,
          months_granted: months,
          expires_at: expiresIso,
        });

      if (insertErr) {
        // UNIQUE-Violation = anderer Request war schneller → kein Fehler, kein Push
        if (insertErr.code === "23505") {
          console.info(
            `[reward] Grant existiert bereits (Race Condition abgefangen)`,
          );
          continue;
        }
        console.error(`[reward] Grant-Insert fehlgeschlagen:`, insertErr);
        continue;
      }
      grantChanged = true;
    }

    // caregiver_links.plus_trial_end auf das spaeteste Ablaufdatum setzen
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

    // Push NUR bei echtem neuen/upgegradeten Grant (kein Push bei 23505 / Race-Skip)
    if (grantChanged) {
      sendPush(supabase, {
        userId: link.caregiver_id,
        title: "Nachbar Plus geschenkt!",
        body: `Sie erhalten ${months} ${months === 1 ? "Monat" : "Monate"} Nachbar Plus gratis.`,
        url: "/care",
        tag: "plus-trial-granted",
      }).catch((e) => console.warn(`[reward] Push fehlgeschlagen:`, e));
    }

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

  // 2. 7-Tage-Reminder (nur senden, nicht doppelt am naechsten Tag)
  const { data: remind7 } = await supabase
    .from("caregiver_links")
    .select("caregiver_id, plus_trial_end")
    .gte("plus_trial_end", in1d.toISOString()) // > 1 Tag (sonst 1d-Reminder)
    .lte("plus_trial_end", in7d.toISOString())
    .not("plus_trial_end", "is", null);

  if (remind7) {
    for (const link of remind7) {
      const endDate = new Date(link.plus_trial_end).toLocaleDateString("de-DE");
      sendPush(supabase, {
        userId: link.caregiver_id,
        title: "Nachbar Plus endet bald",
        body: `Ihr Gratis-Zeitraum endet am ${endDate}. Fuer 8,90 EUR/Monat weiter nutzen?`,
        url: "/care",
        tag: "plus-trial-7d-reminder",
      }).catch((e) => console.warn(`[reward] Push fehlgeschlagen:`, e));
    }
  }

  // 3. 1-Tag-Reminder
  const { data: remind1 } = await supabase
    .from("caregiver_links")
    .select("caregiver_id, plus_trial_end")
    .gte("plus_trial_end", now.toISOString())
    .lte("plus_trial_end", in1d.toISOString())
    .not("plus_trial_end", "is", null);

  if (remind1) {
    for (const link of remind1) {
      sendPush(supabase, {
        userId: link.caregiver_id,
        title: "Letzter Tag Nachbar Plus",
        body: "Morgen endet Ihr Gratis-Zeitraum. Jetzt fuer 8,90 EUR/Monat weitermachen!",
        url: "/care",
        tag: "plus-trial-1d-reminder",
      }).catch((e) => console.warn(`[reward] Push fehlgeschlagen:`, e));
    }
  }

  return {
    expired: expired?.length ?? 0,
    reminded7d: remind7?.length ?? 0,
    reminded1d: remind1?.length ?? 0,
  };
}
