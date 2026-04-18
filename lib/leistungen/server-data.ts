// Server-Helper fuer die Leistungen-Info-Seite.
// Laedt parallel: Quartier (country/state), Subscription, Feature-Flag.
// User-Quarter-Kette: household_members → households.quarter_id → quarters.

import type { SupabaseClient } from "@supabase/supabase-js";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";
import { resolveCountryFromQuarter } from "./get-country";
import type { Country } from "./types";
import type { SubscriptionSnapshot } from "./check-plus";

export interface LeistungenContext {
  country: Country;
  cantonHint: string | null;
  subscription: SubscriptionSnapshot | null;
  flagEnabled: boolean;
}

async function loadQuarterCountry(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ country: string | null; state: string | null } | null> {
  const { data: membership } = await supabase
    .from("household_members")
    .select("household:households!inner(quarter_id)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!membership) return null;
  const household = Array.isArray(
    (membership as { household?: unknown }).household,
  )
    ? (membership as { household: Array<{ quarter_id: string }> }).household[0]
    : (membership as { household: { quarter_id: string } }).household;
  const quarterId = household?.quarter_id;
  if (!quarterId) return null;

  const { data: quarter } = await supabase
    .from("quarters")
    .select("country, state")
    .eq("id", quarterId)
    .maybeSingle();

  return (quarter as { country: string | null; state: string | null }) ?? null;
}

async function loadSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionSnapshot | null> {
  const { data } = await supabase
    .from("care_subscriptions")
    .select("plan, status, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return data as SubscriptionSnapshot;
}

export async function loadLeistungenContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<LeistungenContext> {
  const [quarter, subscription, flagEnabled] = await Promise.all([
    loadQuarterCountry(supabase, userId).catch(() => null),
    loadSubscription(supabase, userId).catch(() => null),
    isFeatureEnabledServer(supabase, "leistungen_info"),
  ]);

  const country = resolveCountryFromQuarter(quarter);
  const cantonHint = country === "CH" ? (quarter?.state ?? null) : null;

  return { country, cantonHint, subscription, flagEnabled };
}
