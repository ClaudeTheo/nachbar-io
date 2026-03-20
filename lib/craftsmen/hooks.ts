// lib/craftsmen/hooks.ts
import { createClient } from "@/lib/supabase/client";
import { CRAFTSMAN_SUBCATEGORIES } from "@/lib/constants";
import type {
  CommunityTip,
  CraftsmanRecommendation,
  CraftsmanUsageEvent,
  CraftsmanAspects,
} from "@/lib/supabase/types";

const VALID_SUBCATEGORY_IDS = new Set(CRAFTSMAN_SUBCATEGORIES.map((s) => s.id));

// Subcategory-Validierung
export function validateSubcategories(ids: string[]): string[] {
  return ids.filter((id) => VALID_SUBCATEGORY_IDS.has(id));
}

// Liste laden (Uebersichtsseite)
export async function loadCraftsmenList(opts: {
  subcategory?: string | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<{ data: CommunityTip[]; hasMore: boolean }> {
  const { subcategory, search, page = 0, pageSize = 20 } = opts;
  const supabase = createClient();

  let query = supabase
    .from("community_tips")
    .select("*, user:users(display_name, avatar_url)")
    .eq("category", "craftsmen")
    .eq("status", "active")
    .order("is_premium", { ascending: false })
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize);

  if (subcategory) {
    query = query.contains("subcategories", [subcategory]);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,business_name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const items = (data ?? []) as unknown as CommunityTip[];
  return { data: items, hasMore: items.length > pageSize };
}

// Detail laden (inkl. Empfehlungen + Usage-Events)
export async function loadCraftsmanDetail(tipId: string) {
  const supabase = createClient();

  const [tipResult, recResult, usageResult] = await Promise.all([
    supabase
      .from("community_tips")
      .select("*, user:users(display_name, avatar_url)")
      .eq("id", tipId)
      .single(),
    supabase
      .from("craftsman_recommendations")
      .select("*, user:users(display_name, avatar_url)")
      .eq("tip_id", tipId)
      .order("created_at", { ascending: false }),
    supabase
      .from("craftsman_usage_events")
      .select("*")
      .eq("tip_id", tipId)
      .order("used_at", { ascending: false }),
  ]);

  if (tipResult.error) throw tipResult.error;

  return {
    tip: tipResult.data as unknown as CommunityTip,
    recommendations: (recResult.data ?? []) as unknown as CraftsmanRecommendation[],
    usageEvents: (usageResult.data ?? []) as unknown as CraftsmanUsageEvent[],
  };
}

// Empfehlung abgeben (Upsert)
export async function submitRecommendation(opts: {
  tipId: string;
  recommends: boolean;
  confirmedUsage: boolean;
  comment: string | null;
  aspects: CraftsmanAspects | null;
}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("craftsman_recommendations")
    .upsert(
      {
        tip_id: opts.tipId,
        user_id: user.id,
        recommends: opts.recommends,
        confirmed_usage: opts.confirmedUsage,
        comment: opts.comment?.trim() || null,
        aspects: opts.aspects,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tip_id,user_id" }
    );

  if (error) return { error: error.message };
  return { error: null };
}

// Nutzung protokollieren
export async function logUsageEvent(opts: {
  tipId: string;
  note?: string | null;
}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("craftsman_usage_events")
    .insert({
      tip_id: opts.tipId,
      user_id: user.id,
      note: opts.note?.trim() || null,
    });

  if (error) return { error: error.message };
  return { error: null };
}
